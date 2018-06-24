from django.shortcuts import render, render_to_response, redirect
from django.template import RequestContext
from django.db.models import Q
from django.utils import timezone

from cir.models import *
from cir.phase_control import PHASE_CONTROL
from cir.settings import DISPATCHER_URL

VISITOR_ROLE = 'visitor'

def home(request):  # access /
    if 'actual_user_id' in request.session:
        del request.session['actual_user_id']
    request.session['forum_id'] = -1

    forum_infos = []

    # don't include private forums
    forums = Forum.objects.exclude(access_level='private')

    if request.user.is_authenticated():
        # add private forums in which I have a role
        forums_q = request.user.role.all().values('forum').query
        forums |= Forum.objects.filter(id__in=forums_q)
    for forum in forums.order_by('-id'):
        try:
            role = Role.objects.get(user=request.user, forum=forum).role
        except:
            role = VISITOR_ROLE
        forum_info = forum.getAttr()
        forum_info['role'] = role
        forum_infos.append(forum_info)

    if request.user.is_authenticated():
        context = {
            'user_id': request.user.id,
            'user_name': request.user.get_full_name(),
            'forums': forum_infos
        }
    else:
        context = {
            'user_id': '-1',
            'forums': forum_infos
        }
    return render(request, 'index_forums.html', context)


def enter_forum(request, forum_url, phase_name):  # access /forum_name
    if 'actual_user_id' in request.session:
        del request.session['actual_user_id']

    context = {}

    # need user name anyway.
    if request.user.is_authenticated():
        context['user_id'] = request.user.id
        context['user_name'] = request.user.get_full_name()
    else:
        context['user_id'] = '-1'

    # check for possible errors
    try:
        forum = Forum.objects.get(url=forum_url)
    except:
        context['load_error'] = '404'
        context['error_msg'] = 'The requested forum is not valid: <b>' + forum_url + '</b>'
        return render(request, 'error_index.html', context)
    if forum.access_level == 'private' and (
                not request.user.is_authenticated() or not Role.objects.filter(user=request.user,
                forum=forum).exists()):
        context['load_error'] = '403'
        return render(request, 'error_index.html', context)
    if phase_name is not None and phase_name not in ['free_discuss', 'nugget', 'extract', 'categorize', 'improve', 'finished']:
        context['load_error'] = '404'
        context['error_msg'] = 'The requested forum phase is not valid: <b>' + phase_name + '</b>'
        return render(request, 'error_index.html', context)

    # if phase_name is not given, redirect to the latest phase.
    if phase_name is None:
        phase = forum.phase
        return redirect('/' + forum_url + '/phase/' + phase)

    for phase_name_tmp in ['free_discuss', 'nugget', 'extract', 'categorize', 'improve', 'finished']:
        if (ComplexPhase.objects.filter(forum = forum, name = phase_name_tmp).count() == 0):
            complexPhase = ComplexPhase(name = phase_name_tmp, description = "", start_time = timezone.now(), end_time = timezone.now(), forum = forum)
            complexPhase.save()

    # load forum info
    request.session['forum_id'] = forum.id
    request.session['selected_phase'] = phase_name
    context['forum_id'] = forum.id
    context['forum_name'] = forum.full_name
    context['forum_url'] = forum.url
    context['forum_description'] = forum.description
    context['phase_info'] = _get_phases(forum, phase_name)

    complexPhase = ComplexPhase.objects.filter(forum = forum, name = phase_name)[0]

    index_html = ''
    if phase_name == 'free_discuss':
        index_html = 'phase0/index.html'
    elif phase_name == 'nugget':
        index_html = 'phase1/index.html'
    elif phase_name == 'extract':
        index_html = 'phase2/index.html'
    elif phase_name == 'categorize':
        index_html = 'phase3/index.html'
    elif phase_name == 'improve':
        index_html = 'phase4/index.html'
    elif phase_name == 'finished':
        index_html = 'phase5/index.html'

    # load role info
    role = VISITOR_ROLE

    if request.user.is_authenticated():
        # update last visited info
        try:
            request.user.info.last_visited_forum = forum
            request.user.info.save()
        except:  # no userinfo found
            UserInfo.objects.create(user=request.user, last_visited_forum=forum)

        try:
            role = Role.objects.get(user=request.user, forum=forum).role
        except:
            pass

    request.session['role'] = context['role'] = role

    return render(request, index_html, context)


def enter_vis(request, forum_url):
    context = {}
    # check for possible errors
    try:
        forum = Forum.objects.get(url=forum_url)
    except:
        context['load_error'] = '404'
        context['error_msg'] = 'The requested forum is not valid: <b>' + forum_url + '</b>'
        return render(request, 'error_index.html', context)
    # get docs, themes, and authors

    context["docs"] = []
    docs = Doc.objects.filter(forum=forum).order_by("order")
    for doc in docs:
        item = {}
        item["id"] = "doc-" + str(doc.id)
        item["name"] = str(doc.title)
        context["docs"].append(item)
    context["themes"] = []
    themes = ClaimTheme.objects.filter(forum=forum)
    for theme in themes:
        item = {}
        item["id"] = "theme-" + str(theme.id)
        item["name"] = str(theme.name)
        context["themes"].append(item)
    context["authors"] = []
    for role in Role.objects.filter(forum=forum, role="panelist"):
        author = role.user
        item = {}
        item["id"] = "author-" + str(author.id)
        item["name"] = str(author.first_name) + " " + str(author.last_name)
        context["authors"].append(item)
    return render(request, "vis/index.html", context)

def _get_phases(forum, selected_phase):
    results = {}
    results['phase'] = forum.phase
    results['selected_phase'] = selected_phase
    results['selected_phase_name'] = _get_full_phase_name(selected_phase)
    results['phases'] = []
    for name in ['free_discuss','nugget', 'extract', 'categorize', 'improve', 'finished']:
    # for name in ['free_discuss','nugget', 'finished']:
        phase_info = {
            'name': name,
            'fullname': _get_full_phase_name(name)
        }
        if name == selected_phase:
            phase_info['status'] = 'active'
        elif (name == 'free_discuss') or \
                (name == 'nugget' and forum.phase != 'free_discuss') or \
                (name == 'extract' and forum.phase != 'nugget') or \
                (name == 'categorize' and forum.phase != 'nugget' and forum.phase != 'extract') or \
                (name == 'improve' and (forum.phase == 'improve' or forum.phase == 'finished')) or \
                (name == 'finished' and forum.phase == 'finished'):
            phase_info['status'] = ''
        else:
            phase_info['status'] = 'disabled'
        results['phases'].append(phase_info)
    print results
    return results


def _get_full_phase_name(name):
    for phase_tuple in Forum.PHASE_CHOICES:
        if phase_tuple[0] == name:
            return phase_tuple[1]
    return ''

def enter_workbench(request, forum_url):  # access /forum_name
    if 'actual_user_id' in request.session:
        del request.session['actual_user_id']
    try:
        forum = Forum.objects.get(url=forum_url)
    except:  # 404
        context = {
            'load_error': '404'
        }
        return render(request, 'workbench.html', context)
    request.session['forum_id'] = forum.id
    request.session['role'] = VISITOR_ROLE
    context = {}
    context['forum_name'] = forum.full_name
    context['forum_url'] = forum.url
    context['phase'] = PHASE_CONTROL[forum.phase]

    if request.user.is_authenticated():
        context['panelists'] = []
        context['staff'] = []
        for panelist in forum.members.filter(role='panelist'):
            context['panelists'].append({
                'id': panelist.user.id,
                'name': panelist.user.get_full_name()
            })
        for staff in forum.members.filter(Q(role='facilitator') | Q(role='admin')).exclude(user=request.user):
            context['staff'].append({
                'id': staff.user.id,
                'name': staff.user.get_full_name()
            })
        try:
            request.user.info.last_visited_forum = forum
            request.user.info.save()
        except:  # no userinfo found
            UserInfo.objects.create(user=request.user, last_visited_forum=forum)
        try:
            request.session['role'] = Role.objects.get(user=request.user, forum=forum).role
        except:
            pass
        context['user_id'] = request.user.id
        context['user_name'] = request.user.get_full_name()
        context['role'] = request.session['role']
    else:
        context['user_id'] = -1
        context['user_name'] = ''
        context['role'] = request.session['role']
    if forum.access_level == 'private' and (
                not request.user.is_authenticated() or not Role.objects.filter(user=request.user,
                    forum=forum).exists()):
        context['load_error'] = '403'
    themes = ClaimTheme.objects.filter(forum=forum)
    context['themes'] = [theme.getAttr() for theme in themes]
    return render(request, 'workbench.html', context)

def enter_sankey(request, forum_url):  # access /forum_name
    context = {}
    if 'actual_user_id' in request.session:
        del request.session['actual_user_id']
    try:
        forum = Forum.objects.get(url=forum_url)
    except:  # 404
        context = {
            'load_error': '404'
        }
    context['forum_id'] = forum.id
    return render(request, 'sankey.html', context)

def enter_statement(request, forum_url):
    if 'actual_user_id' in request.session:
        del request.session['actual_user_id']
    try:
        forum = Forum.objects.get(url=forum_url)
    except:  # 404
        context = {
            'load_error': '404'
        }
        return render(request, 'index_statement.html', context)
    request.session['forum_id'] = forum.id
    request.session['role'] = VISITOR_ROLE
    context = {}
    context['forum_name'] = forum.full_name
    context['forum_url'] = forum.url
    context['stmt_preamble'] = forum.stmt_preamble
    context['claims'] = {
        'findings': [],
        'pros': [],
        'cons': []
    }
    findings = Claim.objects.filter(forum=forum, stmt_order__isnull=False, claim_category='finding').order_by('stmt_order')
    for claim in findings:
        context['claims']['findings'].append(claim.getAttrStmt())
    pros = Claim.objects.filter(forum=forum, stmt_order__isnull=False, claim_category='pro').order_by('stmt_order')
    for claim in pros:
        context['claims']['pros'].append(claim.getAttrStmt())
    cons = Claim.objects.filter(forum=forum, stmt_order__isnull=False, claim_category='con').order_by('stmt_order')
    for claim in cons:
        context['claims']['cons'].append(claim.getAttrStmt())
    return render(request, 'index_statement.html', context)

def handler500(request):
    response = render_to_response('500.html', {}, context_instance=RequestContext(request))
    response.status_code = 500
    return response