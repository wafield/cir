import json
from sets import Set
from datetime import datetime, date, timedelta
import time
import pytz

from django.template.loader import render_to_string
from django.shortcuts import render
from django.http import HttpResponse
from django.utils import timezone
from django.db.models import Q

from cir.models import *

def register_delegator(request):
    response = {}
    user_id = request.REQUEST.get('user_id')
    if user_id == request.user.id:
        # switch back
        if 'actual_user_id' in request.session:
            del request.session['actual_user_id']
    else:
        response['role'] = Role.objects.get(user_id=user_id, forum_id=request.session['forum_id']).role
        request.session['actual_user_id'] = user_id
    return HttpResponse(json.dumps(response), mimetype='application/json')

def enter_dashboard(request, forum_url, dashboard_tab):
    try:
        forum = Forum.objects.get(url=forum_url)
    except:  # 404
        context = {'load_error': '404'}
        return render(request, 'facilitation/index_dashboard.html', context)
    request.session['forum_id'] = forum.id
    request.session['role'] = VISITOR_ROLE
    context = {}
    if request.user.is_authenticated():
        try:
            request.session['role'] = Role.objects.get(user=request.user, forum=forum).role
        except:
            pass
    if request.session['role'] != 'facilitator' and request.session['role'] != 'admin':
        context['load_error'] = '403'
    context['forum_id'] = forum.id
    context['forum_name'] = forum.full_name
    context['forum_url'] = forum.url
    context['description'] = forum.description
    context['stmt_preamble'] = forum.stmt_preamble
    context['access_level'] = forum.access_level
    context['phase'] = forum.phase
    # tag theme
    context['tag_theme'] = {}
    
    context['tag_theme']['undecided'] = []
    sections = DocSection.objects.filter(forum=forum.id)
    undecidedTagSet = Set()
    for section in sections:
        tags = Tag.objects.filter(context=section, claimTheme__isnull=True)
        for tag in tags:
            undecidedTagSet.add(tag.content)
    for tag in undecidedTagSet:
        context['tag_theme']['undecided'].append(tag)
    for theme in ClaimTheme.objects.filter(forum_id=request.session['forum_id']):
        context['tag_theme'][theme.name] = []
        tagSet = Set()
        for tag in theme.tags.all():
            tagSet.add(tag.content)
        for tag in tagSet:
            context['tag_theme'][theme.name].append(tag)
    if (dashboard_tab == "document"):
        return render(request, 'facilitation/document/index.html', context)
    elif (dashboard_tab == "theme"):
        return render(request, 'facilitation/theme/index.html', context)
    elif (dashboard_tab == "phase"):
        context["phase"] = {}
        context["phase_status"] = {}
        phase_name = forum.phase
        complexPhase = ComplexPhase.objects.filter(forum = forum, name = phase_name)[0]
        context["phase"]["start_time"] = complexPhase.start_time
        context["phase"]["end_time"] = complexPhase.end_time
        context["phase"]["description"] = complexPhase.description
        flag = False
        for phase_name_tmp in ['free_discuss', 'nugget', 'extract', 'categorize', 'improve', 'finished']:
            if (not flag):
                if (forum.phase == phase_name_tmp):
                    context["phase_status"][phase_name_tmp] = 1
                    flag = True
                else:
                    context["phase_status"][phase_name_tmp] = 0
            else:
                context["phase_status"][phase_name_tmp] = 2
        print forum.phase
        print context["phase_status"]
        return render(request, 'facilitation/phase/index.html', context)
    elif (dashboard_tab == "message"):
        return render(request, 'facilitation/message/index.html', context)
    return render(request, 'facilitation/overview/index.html', context)

def admin_forum(request):
    response = {}
    action = request.REQUEST.get('action')
    forum = Forum.objects.get(id=request.session['forum_id'])
    if action == 'update-forum-info':
        forum.stmt_preamble = request.REQUEST.get('stmt_preamble')
        forum.full_name = request.REQUEST.get('forum_name')
        forum.url = request.REQUEST.get('forum_url')
        forum.description = request.REQUEST.get('description')
        forum.access_level = request.REQUEST.get('access_level')
        forum.save()
        return HttpResponse(json.dumps(response), mimetype='application/json')



def admin_document(request):
    response = {}
    action = request.REQUEST.get('action')
    forum = Forum.objects.get(id=request.session['forum_id'])
    if action == 'get-categories':
        context = {}
        try:
            # retrieve docs in a folder
            folders = EntryCategory.objects.filter(forum=forum, category_type='doc')
            context['folders'] = []
            for folder in folders:
                folder_info = folder.getAttr()
                folder_info['docs'] = []
                docs = Doc.objects.filter(folder=folder)
                for doc in docs:
                    folder_info['docs'].append(doc.getAttr())
                context['folders'].append(folder_info)
            # retrieve docs not in any folder
            context['root_docs'] = []
            root_docs = Doc.objects.filter(forum_id=request.session['forum_id'], folder__isnull=True)
            for doc in root_docs:
                context['root_docs'].append(doc.getAttr())
            response['html'] = render_to_string("facilitation/doc-manager.html", context)
            return HttpResponse(json.dumps(response), mimetype='application/json')
        except:
            return HttpResponse('Unknown error.', status=403)
    elif action == 'new-folder':
        name = request.REQUEST.get('name')
        description = request.REQUEST.get('description')
        EntryCategory.objects.create(forum=forum, name=name, instructions=description, category_type='doc')
        return HttpResponse(json.dumps(response), mimetype='application/json')
    elif action == 'edit-folder':
        folder = EntryCategory.objects.get(id=request.REQUEST.get('folder_id'))
        name = request.REQUEST.get('name')
        description = request.REQUEST.get('description')
        folder.name = name
        folder.instructions = description
        folder.save()
        return HttpResponse(json.dumps(response), mimetype='application/json')
    elif action == 'new-doc':
        title = request.REQUEST.get('title')
        folder_id = request.REQUEST.get('folder_id')
        description = request.REQUEST.get('description')
        if folder_id == '-1': # add to root folder
            Doc.objects.create(forum=forum, title=title, description=description)
        else:
            folder = EntryCategory.objects.get(id=folder_id)
            Doc.objects.create(forum=forum, title=title, description=description, folder=folder)
        return HttpResponse(json.dumps(response), mimetype='application/json')
    elif action == 'get-doc':
        doc_id = request.REQUEST.get('doc_id')
        doc = Doc.objects.get(id=doc_id)
        context = {}
        context['doc_id'] = doc.id
        context['title'] = doc.title
        context['sections'] = []
        ordered_sections = doc.sections.filter(order__isnull=False).order_by('order')
        for section in ordered_sections:
            context['sections'].append(section.getAttrAdmin())
        unordered_sections = doc.sections.filter(order__isnull=True).order_by('updated_at')
        for section in unordered_sections:
            context['sections'].append(section.getAttrAdmin())
        response['html'] = render_to_string("facilitation/doc-content.html", context)
        return HttpResponse(json.dumps(response), mimetype='application/json')
    elif action == 'edit-doc':
        doc = Doc.objects.get(id=request.REQUEST.get('doc_id'))
        title = request.REQUEST.get('title')
        description = request.REQUEST.get('description')
        doc.title = title
        doc.description = description
        doc.save()
        return HttpResponse(json.dumps(response), mimetype='application/json')

    elif action == 'new-docsection':
        now = timezone.now()
        title = request.REQUEST.get('title')
        content = request.REQUEST.get('content')
        doc_id = request.REQUEST.get('doc_id')
        doc = Doc.objects.get(id=doc_id)
        DocSection.objects.create(
            forum=forum,
            author=request.user,
            content=content,
            created_at=now,
            updated_at=now,
            title=title,
            doc=doc
            # leave order blank
        )
        return HttpResponse(json.dumps(response), mimetype='application/json')
    elif action == 'reorder':
        orders = json.loads(request.REQUEST.get('order'))
        for section_id in orders:
            section = DocSection.objects.get(id=section_id)
            section.order = orders[section_id]
            section.save()
        return HttpResponse(json.dumps(response), mimetype='application/json')
    elif action == 'delete-item':
        item_type = request.REQUEST.get('item_type')
        item_id = request.REQUEST.get('item_id')
        if item_type == 'folder':
            EntryCategory.objects.get(id=item_id).delete()
        elif item_type == 'doc':
            Doc.objects.get(id=item_id).delete()
        elif item_type == 'docsection':
            DocSection.objects.get(id=item_id).delete()
        return HttpResponse(json.dumps(response), mimetype='application/json')

def tag_theme(request):
    print "tag_theme"
    forum = Forum.objects.get(id=request.session['forum_id'])
    action = request.REQUEST.get('action')
    print "action", action
    if (action=="save_tag_theme_change"):
        print "save_tag_theme_change"
        tagThemeDic = request.REQUEST.get('tagthemedic')
        try:
            dic = json.loads(tagThemeDic)
            for theme in dic:
                if (theme!="undecided"):
                    print "theme=", theme
                    claimTheme, created = ClaimTheme.objects.get_or_create(forum_id=request.session['forum_id'], name=theme)
                    for item in dic[theme]:
                        tags = Tag.objects.filter(content=item)
                        for tag in tags:
                            tag.claimTheme = claimTheme
                            tag.save()
        except:
            print "except"
    return HttpResponse()

def user_mgmt(request):
    response = {}
    forum = Forum.objects.get(id=request.session['forum_id'])
    action = request.REQUEST.get('action')
    if action == 'get_user_list' or 'get_user_list_msg':
        context = {}
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
        context['user_id'] = request.user.id
        context['user_name'] = request.user.get_full_name()
        if action == 'get_user_list':
            response['html'] = render_to_string('header/user_switch_menu.html', context)
        else:
            response['html'] = render_to_string('facilitation/msg-userlist.html', context)
    return HttpResponse(json.dumps(response), mimetype='application/json')

def admin_msg(request):
    response = {}
    forum = Forum.objects.get(id=request.session['forum_id'])
    action = request.REQUEST.get('action')
    if action == 'get-history':
        context = {'msgs': []}
        for msg in Message.objects.filter(forum=forum, content_type='facilitation'):
            context['msgs'].append(msg.getAttr())
        response['html'] = render_to_string('facilitation/msg-history.html', context)
    if action == 'send-msg':
        now = timezone.now()
        content = request.REQUEST.get('content')
        for panelist in forum.members.filter(role='panelist'):
            Message.objects.create(
                forum=forum,
                sender=request.user,
                receiver=panelist.user,
                content=content,
                created_at=now,
                content_type='facilitation'
            )
    if action == 'retrieve-msg':
        context = {'msgs': []}
        for msg in Message.objects.filter(forum=forum, receiver=request.user):
            context['msgs'].append(msg.getAttr())
        context['msgs'] = sorted(context['msgs'], key=lambda en: en['created_at_full'], reverse=True)
        response['html'] = render_to_string('msg-list.html', context)
    if action == 'mark-read':
        msg = Message.objects.get(id=request.REQUEST.get('msg_id'))
        msg.unread = False
        msg.save()
    if action == 'mark-done':
        msg = Message.objects.get(id=request.REQUEST.get('msg_id'))
        msg.is_done = True
        msg.save()
    return HttpResponse(json.dumps(response), mimetype='application/json')

def get_pie(request):
    response = {}
    response["html"] = render_to_string('facilitation/vis/pie.html')
    return HttpResponse(json.dumps(response), mimetype='application/json')

def get_highlights(request):
    # filters
    forum = Forum.objects.get(id = request.session['forum_id'])
    theme_ids = ClaimTheme.objects.filter(forum = forum).values("id")
    highlights = Highlight.objects.filter(theme_id__in = theme_ids, is_nugget = True)
    response = {}
    response['highlights'] = []
    for highlight in highlights:
        highlight_info = {}
        highlight_info["id"] = highlight.id
        highlight_info["date"] = timezone.localtime(highlight.created_at).strftime("%Y %m %d %H %M %S")
        highlight_info["doc_id"] = DocSection.objects.get(id = highlight.context.id).doc.id
        highlight_info["theme_id"] = highlight.theme.id
        highlight_info["author_id"] = highlight.author.id
        highlight_info["author_name"] = str(highlight.author.first_name + " " + highlight.author.last_name)
        highlight_info["theme_name"] = str(highlight.theme.name)
        response['highlights'].append(highlight_info)
    # we only consider root docs by this moment
    root_docs = Doc.objects.filter(forum=forum, folder__isnull=True).order_by("order")
    nuggetmaps = NuggetMap.objects.filter(doc_id__in = root_docs.values('id'))
    viewlogs = ViewLog.objects.filter(doc_id__in = root_docs.values('id'))
    if (nuggetmaps.count() != 0 and viewlogs.count() != 0):
        time_upper_bound = max(nuggetmaps.order_by("-created_at")[0].created_at, viewlogs.order_by("-created_at")[0].created_at)
        time_lower_bound = min(nuggetmaps.order_by("created_at")[0].created_at, viewlogs.order_by("created_at")[0].created_at)
    elif nuggetmaps.count() != 0:
        time_upper_bound = nuggetmaps.order_by("-created_at")[0].created_at
        time_lower_bound = nuggetmaps.order_by("created_at")[0].created_at
    elif viewlogs.count() != 0:
        time_upper_bound = viewlogs.order_by("-created_at")[0].created_at
        time_lower_bound = viewlogs.order_by("created_at")[0].created_at
    else:
        time_upper_bound = datetime.datetime(2011, 8, 15, 8, 15, 12, 0, pytz.UTC)
        time_lower_bound = datetime.datetime(2021, 8, 15, 8, 15, 12, 0, pytz.UTC)
    print time_upper_bound
    print time_lower_bound
    time_upper_bound = timezone.localtime(time_upper_bound).strftime("%Y %m %d %H %M")
    time_lower_bound = timezone.localtime(time_lower_bound).strftime("%Y %m %d %H %M")
    response["time_upper_bound"] = time_upper_bound
    response["time_lower_bound"] = time_lower_bound
    return HttpResponse(json.dumps(response), mimetype='application/json')

def theme(request):
    forum = Forum.objects.get(id = request.session['forum_id'])
    action = request.REQUEST.get('action')
    response = {}
    context = {}
    if (action == "save-theme"):
        theme_id = request.REQUEST.get("theme_id")
        theme_name = request.REQUEST.get("theme_name")
        theme_description = request.REQUEST.get("theme_description")
        if (theme_id == ""): 
            theme = ClaimTheme(name = theme_name, forum = forum, description = theme_description)
        else:
            theme = ClaimTheme.objects.get(id = theme_id)
            theme.name = theme_name
            theme.description = theme_description
        theme.save()
    elif (action == "remove-theme"):
        theme_id = request.REQUEST.get("theme_id")
        theme = ClaimTheme.objects.get(id = theme_id)
        theme.delete()
    themes = ClaimTheme.objects.filter(forum = forum)
    context["themes"] = []
    for theme in themes:
        item = {}
        item["id"] = str(theme.id)
        item["name"] = str(theme.name)
        item["description"] = str(theme.description)
        context["themes"].append(item)
    response["html"] = render_to_string('facilitation/theme/theme-table.html', context);
    return HttpResponse(json.dumps(response), mimetype='application/json')

def phase(request):
    forum = Forum.objects.get(id = request.session['forum_id'])
    action = request.REQUEST.get('action')
    response = {}
    context = {}
    if (action == "save-message"):
        message_id = request.REQUEST.get("message_id")
        message_content = request.REQUEST.get("message_content")
        phase_name = request.REQUEST.get('phase_name')
        complexPhase = ComplexPhase.objects.filter(forum = forum, name = phase_name)[0]
        is_show = True if (request.REQUEST.get('is_show') == "true") else False
        if (message_id == ""): 
            pinMessage = PinMessage(content = message_content, phase = complexPhase, is_show = is_show)
        else:
            pinMessage = PinMessage.objects.get(id = message_id)
            pinMessage.content = message_content
            pinMessage.is_show = is_show
        pinMessage.save()
    elif (action == "remove-message"):
        message_id = request.REQUEST.get("message_id")
        message = PinMessage.objects.get(id = message_id)
        message.delete()
    if (action == "change-phase"):
        phase = request.REQUEST.get('phase')
        forum.phase = phase
        forum.save()
    context["phase"] = {}
    context["phase_status"] = {}
    if (request.REQUEST.get('phase_name')):
        phase_name = request.REQUEST.get('phase_name')
    else:
        phase_name = forum.phase
    complexPhase = ComplexPhase.objects.filter(forum = forum, name = phase_name)[0]
    context["phase"]["full_name"] = complexPhase.get_name_display()
    context["phase"]["name"] = complexPhase.name
    context["phase"]["start_time"] = complexPhase.start_time
    context["phase"]["end_time"] = complexPhase.end_time
    context["phase"]["description"] = complexPhase.description
    flag = False
    for phase_name_tmp in ['free_discuss', 'nugget', 'extract', 'categorize', 'improve', 'finished']:
        if (not flag):
            if (forum.phase == phase_name_tmp):
                context["phase_status"][phase_name_tmp] = 1
                flag = True
            else:
                context["phase_status"][phase_name_tmp] = 0
        else:
            context["phase_status"][phase_name_tmp] = 2
    context["phase"]["status"] = complexPhase.status
    context["messages"] = []
    for message in PinMessage.objects.filter(phase = complexPhase):
        context["messages"].append(message)
    response["html"] = render_to_string('facilitation/phase/phase-detail.html', context);
    return HttpResponse(json.dumps(response), mimetype='application/json')

def document(request):
    response = {}
    action = request.REQUEST.get('action')
    forum = Forum.objects.get(id=request.session['forum_id'])
    if action == 'get-categories':
        context = {}
        try:
            # retrieve docs in a folder
            folders = EntryCategory.objects.filter(forum=forum, category_type='doc')
            context['folders'] = []
            for folder in folders:
                folder_info = folder.getAttr()
                folder_info['docs'] = []
                docs = Doc.objects.filter(folder=folder)
                for doc in docs:
                    folder_info['docs'].append(doc.getAttr())
                context['folders'].append(folder_info)
            # retrieve docs not in any folder
            context['root_docs'] = []
            root_docs = Doc.objects.filter(forum_id=request.session['forum_id'], folder__isnull=True)
            for doc in root_docs:
                context['root_docs'].append(doc.getAttr())
            response['html'] = render_to_string("facilitation/document.html", context)
            return HttpResponse(json.dumps(response), mimetype='application/json')
        except:
            return HttpResponse('Unknown error.', status=403)
    elif action == 'new-folder':
        print "--------------------------------------"
        name = request.REQUEST.get('name')
        print "name = ", name
        description = request.REQUEST.get('description')
        EntryCategory.objects.create(forum=forum, name=name, instructions=description, category_type='doc')
        return HttpResponse(json.dumps(response), mimetype='application/json')
    elif action == 'edit-folder':
        folder = EntryCategory.objects.get(id=request.REQUEST.get('folder_id'))
        name = request.REQUEST.get('name')
        description = request.REQUEST.get('description')
        folder.name = name
        folder.instructions = description
        folder.save()
        return HttpResponse(json.dumps(response), mimetype='application/json')
    elif action == 'new-doc':
        title = request.REQUEST.get('title')
        folder_id = request.REQUEST.get('folder_id')
        description = request.REQUEST.get('description')
        if folder_id == '-1': # add to root folder
            Doc.objects.create(forum=forum, title=title, description=description)
        else:
            folder = EntryCategory.objects.get(id=folder_id)
            Doc.objects.create(forum=forum, title=title, description=description, folder=folder)
        return HttpResponse(json.dumps(response), mimetype='application/json')
    elif action == 'get-doc':
        doc_id = request.REQUEST.get('doc_id')
        doc = Doc.objects.get(id=doc_id)
        context = {}
        context['doc_id'] = doc.id
        context['title'] = doc.title
        context['sections'] = []
        ordered_sections = doc.sections.filter(order__isnull=False).order_by('order')
        for section in ordered_sections:
            context['sections'].append(section.getAttrAdmin())
        unordered_sections = doc.sections.filter(order__isnull=True).order_by('updated_at')
        for section in unordered_sections:
            context['sections'].append(section.getAttrAdmin())
        response['html'] = render_to_string("facilitation/document/doc-content.html", context)
        return HttpResponse(json.dumps(response), mimetype='application/json')
    elif action == 'edit-doc':
        doc = Doc.objects.get(id=request.REQUEST.get('doc_id'))
        title = request.REQUEST.get('title')
        description = request.REQUEST.get('description')
        doc.title = title
        doc.description = description
        doc.save()
        return HttpResponse(json.dumps(response), mimetype='application/json')

    elif action == 'new-docsection':
        now = timezone.now()
        title = request.REQUEST.get('title')
        content = request.REQUEST.get('content')
        doc_id = request.REQUEST.get('doc_id')
        doc = Doc.objects.get(id=doc_id)
        DocSection.objects.create(
            forum=forum,
            author=request.user,
            content=content,
            created_at=now,
            updated_at=now,
            title=title,
            doc=doc
            # leave order blank
        )
        return HttpResponse(json.dumps(response), mimetype='application/json')
    elif action == 'reorder':
        orders = json.loads(request.REQUEST.get('order'))
        for section_id in orders:
            section = DocSection.objects.get(id=section_id)
            section.order = orders[section_id]
            section.save()
        return HttpResponse(json.dumps(response), mimetype='application/json')
    elif action == 'delete-item':
        item_type = request.REQUEST.get('item_type')
        item_id = request.REQUEST.get('item_id')
        if item_type == 'folder':
            EntryCategory.objects.get(id=item_id).delete()
        elif item_type == 'doc':
            Doc.objects.get(id=item_id).delete()
        elif item_type == 'docsection':
            DocSection.objects.get(id=item_id).delete()
        return HttpResponse(json.dumps(response), mimetype='application/json')