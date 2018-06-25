import json

from django.template.loader import render_to_string
from django.http import HttpResponse
from django.utils import timezone
from django.db.models import Max

from cir.models import *
import random

VISITOR_ROLE = 'visitor'


def api_get_claim(request):
    response = {}
    action = request.REQUEST.get('action')
    forum = Forum.objects.get(id=request.session['forum_id'])
    context = {}
    claims = Claim.objects.filter(forum=forum, is_deleted=False, published=True,
                                  stmt_order__isnull=True)
    category = request.REQUEST.get('category')
    if category:
        context['category'] = category
        if category == 'undecided':
            claims = claims.filter(claim_category__isnull=True)
        else:
            claims = claims.filter(claim_category=category)
    theme = request.REQUEST.get('theme')
    if theme:
        if theme == '-1':
            claims = claims.filter(theme__isnull=True)
            context['theme'] = 'Undecided'
        else:
            context['theme'] = ClaimTheme.objects.get(id=theme).name
            claims = claims.filter(theme_id=theme)
    context['claims'] = []
    context['claims_cnt'] = 0

    if action == 'get-claim':
        for claim in claims:
            context['claims_cnt'] += 1
            context['claims'].append(claim.getAttr(forum))
        context['claims'] = sorted(context['claims'],
                                   key=lambda c: c['updated_at_full'],
                                   reverse=True)
        # random.shuffle(context['claims'])
        response['html'] = render_to_string("claim-common/claim-overview.html",
                                            context)

    elif action == 'navigator':
        context['option'] = {}
        if request.REQUEST.get('update_claim') == 'true':
            context['option']['claim'] = True
            for claim in claims:
                context['claims_cnt'] += 1
                context['claims'].append(claim.getExcerpt(forum))
            context['claims'] = sorted(context['claims'],
                                       key=lambda c: c['updated_at_full'],
                                       reverse=True)
        if request.REQUEST.get('update_filter') == 'true':
            context['option']['filter'] = True
            context['themes'] = [theme.getAttr() for theme in
                                 ClaimTheme.objects.filter(forum=forum)]
        response['html'] = render_to_string("claim-common/claim-filter.html",
                                            context)
    return HttpResponse(json.dumps(response), mimetype='application/json')


def api_get_slot(request):
    """
    Used when expanding one single slot as a workspace.
    :param request:
    :return:
    """
    response = {}
    action = request.REQUEST.get('action')
    context = {}

    if action == 'get-slot':
        slot = Claim.objects.get(id=request.REQUEST.get('slot_id'))
        forum = Forum.objects.get(id=request.session['forum_id'])
        context['slot'] = slot.getAttrSlot(forum)
        context['slot_order'] = Claim.objects.filter(forum=forum,
                                                     claim_category=slot.claim_category,
                                                     stmt_order__lte=slot.stmt_order).count()
    response['html'] = render_to_string("claim-common/claim-fullscreen.html",
                                        context)
    response['popup_nuggets'] = render_to_string("phase1/popup-nuggets.html",
                                                 context)
    return HttpResponse(json.dumps(response), mimetype='application/json')


def api_draft_stmt(request):
    """
    Actions related to the draft statement. Can retrieve claims (nuggets),
    claims, or claims (statement candidates) :param request: :return:
    """
    response = {}
    action = request.REQUEST.get('action')
    forum = Forum.objects.get(id=request.session['forum_id'])
    context = {}

    if action == 'change-title':
        slot = Claim.objects.get(id=request.REQUEST['slot_id'])
        new_title = request.REQUEST['new_title']
        slot.title = new_title
        slot.save()
        return HttpResponse(json.dumps(response), mimetype='application/json')
    if action == 'initiate-empty-slot':
        now = timezone.now()
        claim_category = request.REQUEST.get('category')
        slot_title = request.REQUEST.get('content')
        # order = int(request.REQUEST['order']) # order of the slot
        order = 1
        exist_slots = Claim.objects.filter(forum=forum,
                                           stmt_order__isnull=False,
                                           claim_category=claim_category)
        if (exist_slots.count() > 0):
            order = exist_slots.order_by("-stmt_order")[0].stmt_order + 1

        # the "claim" will have an unassigned theme by default.
        if 'actual_user_id' in request.session:
            actual_author = User.objects.get(
                id=request.session['actual_user_id'])
        else:
            actual_author = None

        if actual_author:
            newSlot = Claim(forum=forum, author=actual_author,
                            delegator=request.user,
                            created_at=now, updated_at=now,
                            claim_category=claim_category, title=slot_title)
        else:
            newSlot = Claim(forum=forum, author=request.user, created_at=now,
                            updated_at=now, claim_category=claim_category,
                            title=slot_title)

        # refresh slots one by one
        slots = Claim.objects.filter(forum=forum, stmt_order__isnull=False,
                                     claim_category=claim_category)
        for slot in slots:
            if slot.stmt_order >= order:
                slot.stmt_order += 1
                slot.save()
        newSlot.stmt_order = order
        newSlot.save()
        response["slot_id"] = newSlot.id
        response["slot_order"] = order
    if action == 'initiate-slot':
        now = timezone.now()
        claim_category = request.REQUEST.get('list_type')
        selected_claim = Claim.objects.get(id=request.REQUEST['claim_id'])
        # order = int(request.REQUEST['order']) # order of the slot
        order = 1
        exist_slots = Claim.objects.filter(forum=forum,
                                           stmt_order__isnull=False,
                                           claim_category=claim_category)
        if (exist_slots.count() > 0):
            order = exist_slots.order_by("-stmt_order")[0].stmt_order + 1

        # the "claim" will have an unassigned theme by default.
        if 'actual_user_id' in request.session:
            actual_author = User.objects.get(
                id=request.session['actual_user_id'])
        else:
            actual_author = None

        if actual_author:
            newSlot = Claim(forum=forum, author=actual_author,
                            delegator=request.user,
                            created_at=now, updated_at=now,
                            claim_category=claim_category)
        else:
            newSlot = Claim(forum=forum, author=request.user, created_at=now,
                            updated_at=now, claim_category=claim_category)

        # refresh slots one by one
        slots = Claim.objects.filter(forum=forum, stmt_order__isnull=False,
                                     claim_category=claim_category)
        for slot in slots:
            if slot.stmt_order >= order:
                slot.stmt_order += 1
                slot.save()
        newSlot.stmt_order = order
        newSlot.save()
        response["slot_id"] = newSlot.id
        response["slot_order"] = order
        if actual_author:
            SlotAssignment.objects.create(forum=forum, user=actual_author,
                                          delegator=request.user,
                                          entry=selected_claim, created_at=now,
                                          slot=newSlot, event_type='add')
        else:
            SlotAssignment.objects.create(forum=forum, user=request.user,
                                          entry=selected_claim, created_at=now,
                                          slot=newSlot, event_type='add')

        # add claim reference: newSlot references selected_claim
        ClaimReference.objects.create(refer_type='stmt',
                                      from_claim=selected_claim,
                                      to_claim=newSlot)

    if action == 'add-to-slot':  # merge with existing
        now = timezone.now()
        slot = Claim.objects.get(id=request.REQUEST['slot_id'])
        claim = Claim.objects.get(id=request.REQUEST['claim_id'])
        if not ClaimReference.objects.filter(refer_type='stmt',
                                             from_claim=claim,
                                             to_claim=slot).exists():
            ClaimReference.objects.create(refer_type='stmt', from_claim=claim,
                                          to_claim=slot)
        if 'actual_user_id' in request.session:
            actual_author = User.objects.get(
                id=request.session['actual_user_id'])
            SlotAssignment.objects.create(forum=forum, user=actual_author,
                                          delegator=request.user,
                                          entry=claim, created_at=now,
                                          slot=slot, event_type='add')
        else:
            SlotAssignment.objects.create(forum=forum, user=request.user,
                                          entry=claim, created_at=now,
                                          slot=slot, event_type='add')
        response["slot_id"] = slot.id
        response["slot_order"] = slot.stmt_order
    if action == 'destmt':
        now = timezone.now()
        claim = Claim.objects.get(id=request.REQUEST['claim_id'])
        slot = Claim.objects.get(id=request.REQUEST['slot_id'])
        ClaimReference.objects.filter(refer_type='stmt', from_claim=claim,
                                      to_claim=slot).delete()
        if request.session[
            'selected_phase'] == 'categorize' and ClaimReference.objects.filter(
                refer_type='stmt', to_claim=slot).count() == 0:
            # the last reference is removed, when in categorize phase
            slot.is_deleted = True
            slot.stmt_order = None
            slot.save()
        else:
            if 'actual_user_id' in request.session:
                actual_author = User.objects.get(
                    id=request.session['actual_user_id'])
                SlotAssignment.objects.create(forum=forum, user=actual_author,
                                              delegator=request.user,
                                              entry=claim, created_at=now,
                                              slot=slot, event_type='remove')
            else:
                SlotAssignment.objects.create(forum=forum, user=request.user,
                                              entry=claim, created_at=now,
                                              slot=slot, event_type='remove')

    if action == 'move-to-slot':
        now = timezone.now()
        claim = Claim.objects.get(id=request.REQUEST['claim_id'])
        from_slot = Claim.objects.get(id=request.REQUEST['from_slot_id'])
        to_slot = Claim.objects.get(id=request.REQUEST['to_slot_id'])
        if from_slot != to_slot:
            ClaimReference.objects.filter(refer_type='stmt', from_claim=claim,
                                          to_claim=from_slot).delete()
            if not ClaimReference.objects.filter(refer_type='stmt',
                                                 from_claim=claim,
                                                 to_claim=to_slot).exists():
                ClaimReference.objects.create(refer_type='stmt',
                                              from_claim=claim,
                                              to_claim=to_slot)
            if 'actual_user_id' in request.session:
                actual_author = User.objects.get(
                    id=request.session['actual_user_id'])
                SlotAssignment.objects.create(forum=forum, user=actual_author,
                                              delegator=request.user,
                                              entry=claim, created_at=now,
                                              slot=from_slot,
                                              event_type='remove')
                SlotAssignment.objects.create(forum=forum, user=actual_author,
                                              delegator=request.user,
                                              entry=claim, created_at=now,
                                              slot=to_slot, event_type='add')
            else:
                SlotAssignment.objects.create(forum=forum, user=request.user,
                                              entry=claim, created_at=now,
                                              slot=from_slot,
                                              event_type='remove')
                SlotAssignment.objects.create(forum=forum, user=request.user,
                                              entry=claim, created_at=now,
                                              slot=to_slot, event_type='add')

    # for all actions, return updated lists
    if request.REQUEST.get('category'):
        category_list = [request.REQUEST['category']]
    else:
        category_list = ['finding', 'pro', 'con']
    context['categories'] = {}
    response['slots_cnt'] = {'finding': 0, 'pro': 0, 'con': 0}
    slots = Claim.objects.filter(forum=forum, is_deleted=False,
                                 stmt_order__isnull=False)
    for category in category_list:
        context['categories'][category] = [slot.getAttrSlot(forum) for slot in
                                           slots.filter(
                                               claim_category=category).order_by(
                                               'stmt_order')]
        response['slots_cnt'][category] += len(context['categories'][category])

    # if request.user:
    #     actual_author = request.user
    #     context["my_statement"] = []
    #     my_slot_ids = []
    #     for slot_id in (SlotAssignment.objects.filter(user = actual_author, forum = forum).order_by('-created_at').values_list('slot', flat=True)):
    #         if (slot_id not in my_slot_ids): my_slot_ids.append(slot_id)
    #     for slot_id in my_slot_ids:
    #         slot = Claim.objects.get(id = slot_id)
    #         if (slot.is_deleted == False): context["my_statement"].append(slot.getAttrSlot(forum))
    # for slot in Claim.objects.filter(forum=forum, is_deleted=False, stmt_order__isnull=False).order_by('created_at'):
    #     if (SlotAssignment.objects.filter(slot = slot, user = actual_author).count() > 0):
    #         context["my_statement"].append(slot.getAttrSlot(forum))
    # response['my_statement'] = render_to_string('phase3/my-statement.html', context)

    # if request.session['selected_phase'] == 'categorize':
    #     response['html'] = render_to_string('phase3/draft-stmt.html', context)
    # else:
    #     response['html'] = render_to_string('phase4/draft-stmt.html', context)
    response['html'] = render_to_string('phase1/statement.html', context)
    return HttpResponse(json.dumps(response), mimetype='application/json')


def api_claim(request):
    response = {}
    action = request.REQUEST.get('action')
    if 'actual_user_id' in request.session:
        actual_author = User.objects.get(id=request.session['actual_user_id'])
    else:
        actual_author = None
    if not request.user.is_authenticated():
        return HttpResponse("Please log in first.", status=403)
    if action == 'create':
        highlight = Highlight.objects.get(
            id=request.REQUEST.get('highlight_id'))
        _add_claim(request, highlight)
    elif action == 'update':
        _edit_claim(request)
    elif action == 'delete':
        claim = Claim.objects.get(id=request.REQUEST.get('claim_id'))
        now = timezone.now()
        claim.is_deleted = True
        claim.updated_at = now
        for version in claim.versions.all():
            version.is_deleted = True
            version.updated_at = now
            version.save()
        claim.save()
    elif action == 'reword':
        claim_ids = request.REQUEST.getlist('claim_ids[]')
        forum = Forum.objects.get(id=request.session['forum_id'])
        slot = Claim.objects.get(id=request.REQUEST.get('slot_id'))
        content = request.REQUEST.get('content')
        collective = request.REQUEST.get('collective')
        request_action = request.REQUEST.get('request_action', 'false')
        now = timezone.now()
        order = 1
        if (ClaimVersion.objects.filter(claim=slot,
                                        order__isnull=False).count() > 0):
            order = ClaimVersion.objects.filter(claim=slot,
                                                order__isnull=False).values_list(
                "order", flat=True).order_by('-order')[0] + 1
        new_version = ClaimVersion(forum_id=request.session['forum_id'],
                                   content=content, created_at=now,
                                   updated_at=now, is_adopted=False, claim=slot,
                                   order=order)
        if collective == 'true':
            new_version.collective = True
            # automatically adopt
            new_version.is_adopted = True
            slot.updated_at = now
            slot.save()
        if actual_author:
            new_version.author = actual_author
            new_version.delegator = request.user
        else:
            new_version.author = request.user
        new_version.save()
        StatementVersion.objects.create(author=request.user,
                                        claim_version=new_version,
                                        updated_at=now, text=content)
        print "---------------------------"
        for claim_id in claim_ids:
            print claim_id
            StatementClaim.objects.create(statement=new_version,
                                          claim_id=claim_id)

        # send messages
        message_type = 'version'
        if request_action == 'true':
            message_type = 'version-action'

        for panelist in forum.members.filter(role='panelist'):
            Message.objects.create(
                forum=forum,
                sender=new_version.author,
                receiver=panelist.user,
                content=new_version.content,
                created_at=now,
                content_type=message_type,
                target_entry=new_version
            )
    elif action == 'merge':
        now = timezone.now()
        content = request.REQUEST.get('content')
        if actual_author:
            newClaim = Claim(forum_id=request.session['forum_id'],
                             author=actual_author, delegator=request.user,
                             created_at=now, updated_at=now)
            newClaim.save()
            ClaimVersion.objects.create(forum_id=request.session['forum_id'],
                                        author=actual_author,
                                        delegator=request.user, content=content,
                                        created_at=now, updated_at=now,
                                        claim=newClaim)
        else:
            newClaim = Claim(forum_id=request.session['forum_id'],
                             author=request.user, created_at=now,
                             updated_at=now)
            newClaim.save()
            ClaimVersion.objects.create(forum_id=request.session['forum_id'],
                                        author=request.user, content=content,
                                        created_at=now, updated_at=now,
                                        claim=newClaim)
        claim_ids = request.REQUEST.get('claim_ids').split()
        for claim_id in claim_ids:
            oldClaim = Claim.objects.get(id=claim_id)
            ClaimReference.objects.create(refer_type='merge',
                                          from_claim=oldClaim,
                                          to_claim=newClaim)
            newClaim.theme = oldClaim.theme
            newClaim.claim_category = oldClaim.claim_category
        newClaim.save()
    elif action == 'duplicate':
        claim = Claim.objects.get(id=request.REQUEST.get('claim_id'))
        version = claim.adopted_version()
        claim.pk = None
        claim.save()
        # duplicate its adopted version
        version.pk = None
        version.claim = claim
        version.save()
    elif action == 'change category':
        claim = Claim.objects.get(id=request.REQUEST.get('claim_id'))
        vote_type = request.REQUEST.get('type')
        # add a collective event
        if 'actual_user_id' in request.session:
            actual_author = User.objects.get(
                id=request.session['actual_user_id'])
        else:
            actual_author = None
        if actual_author:
            Vote.objects.create(user=actual_author, delegator=request.user,
                                entry=claim, vote_type=vote_type,
                                created_at=timezone.now(), collective=True)
        else:
            Vote.objects.create(user=request.user, entry=claim,
                                vote_type=vote_type, created_at=timezone.now(),
                                collective=True)
        # change the claim itself
        if vote_type in ['pro', 'con', 'finding', 'discarded']:
            claim.claim_category = vote_type
            claim.save()
    return HttpResponse(json.dumps(response), mimetype='application/json')


def api_claim_activities(request):
    response = {}
    action = request.REQUEST.get('action')
    if action == 'load-thread':
        context = {}
        context['entries'] = []
        forum = Forum.objects.get(id=request.session['forum_id'])

        if request.REQUEST.get('root_id'):
            try:
                # entry is a post -- trace back to slot
                root = Post.objects.get(id=request.REQUEST.get('root_id'))
                while True:
                    try:
                        root = root.post.target_entry
                    except:
                        break
                try:
                    slot = root.claim
                except:
                    slot = root.claimversion.claim
            except:
                root = ClaimVersion.objects.get(
                    id=request.REQUEST.get('root_id'))
                slot = root.claim
        else:
            slot = Claim.objects.get(id=request.REQUEST.get('slot_id'))

        posts = slot.comments_of_entry.all()
        for post in posts:
            for comment in post.getTree(exclude_root=False):
                context['entries'].append(comment.getAttr(forum))

        # performed rewording
        for version in slot.versions.all():
            version_info = version.getAttr(forum)
            context['entries'].append(version_info)
            posts = version.comments_of_entry.all()
            for post in posts:
                for comment in post.getTree(exclude_root=False):
                    context['entries'].append(comment.getAttr(forum))

        # slot assignment events
        slotassignments = SlotAssignment.objects.filter(slot=slot)
        for slotassignment in slotassignments:
            context['entries'].append(slotassignment.getAttr(forum))

        context['entries'] = sorted(context['entries'],
                                    key=lambda en: en['created_at_full'],
                                    reverse=True)
        response['html'] = render_to_string('feed/activity-feed-claim.html',
                                            context)
        return HttpResponse(json.dumps(response), mimetype='application/json')


def _edit_claim(request):
    content = request.REQUEST.get('content')
    now = timezone.now()
    claim_version = ClaimVersion.objects.get(
        id=request.REQUEST.get('claim_version_id'))
    claim_version.content = content
    claim_version.claim.updated_at = now
    claim_version.save()
    user = request.user
    StatementVersion.objects.create(author=user, claim_version=claim_version,
                                    updated_at=now, text=content)


def _add_claim(request,
               highlight):  # by this point user authentication must has been checked
    private = request.REQUEST.get('nopublish')
    content = request.REQUEST.get('content')
    theme_id = request.REQUEST.get('theme')
    now = timezone.now()
    theme = None
    if theme_id:
        theme = ClaimTheme.objects.get(id=theme_id)
    if 'actual_user_id' in request.session:
        actual_author = User.objects.get(id=request.session['actual_user_id'])
    else:
        actual_author = None
    if actual_author:
        newClaim = Claim(forum_id=request.session['forum_id'],
                         author=actual_author, delegator=request.user,
                         created_at=now, updated_at=now,
                         source_highlight=highlight, theme=theme)
    else:
        newClaim = Claim(forum_id=request.session['forum_id'],
                         author=request.user, created_at=now, updated_at=now,
                         source_highlight=highlight, theme=theme)
    newClaim.published = private == 'false'
    newClaim.save()
    if actual_author:
        claim_version = ClaimVersion(forum_id=request.session['forum_id'],
                                     author=actual_author,
                                     delegator=request.user,
                                     content=content, created_at=now,
                                     updated_at=now, claim=newClaim)
    else:
        claim_version = ClaimVersion(forum_id=request.session['forum_id'],
                                     author=request.user, content=content,
                                     created_at=now, updated_at=now,
                                     claim=newClaim)
    claim_version.save()
    return newClaim


def _get_claim_votes(user, claim):
    ret = {}
    if not user.is_authenticated():
        for vote_type in ['pro', 'con', 'finding', 'discarded', 'prioritize']:
            votes = Vote.objects.filter(entry=claim, vote_type=vote_type,
                                        collective=False).order_by(
                '-created_at')
            ret[vote_type] = [vote.user.get_full_name() for vote in votes]
    else:
        ret['my_votes'] = '|'.join(
            Vote.objects.filter(entry=claim, user=user,
                                collective=False).values_list('vote_type',
                                                              flat=True))
        for vote_type in ['pro', 'con', 'finding', 'discarded', 'prioritize']:
            votes = Vote.objects.filter(entry=claim, vote_type=vote_type,
                                        collective=False).order_by(
                '-created_at')
            ret[vote_type] = [vote.user.get_full_name() for vote in votes if
                              vote.user != user]
    return ret


def _get_version_votes(user, claim_version):
    ret = {}
    if not user.is_authenticated():
        for vote_type in ['like']:
            votes = claim_version.events.filter(
                vote__vote_type=vote_type).order_by('-created_at')
            ret[vote_type] = [vote.user.get_full_name() for vote in votes]
    else:
        ret['my_votes'] = '|'.join(
            Vote.objects.filter(entry=claim_version, user=user).values_list(
                'vote_type', flat=True))
        for vote_type in ['like']:
            votes = claim_version.events.filter(
                vote__vote_type=vote_type).order_by('-created_at')
            ret[vote_type] = [vote.user.get_full_name() for vote in votes if
                              vote.user != user]
    return ret


def api_get_flags(request):
    response = {}
    action = request.REQUEST.get('action')
    if action == 'load_single':
        claim = Claim.objects.get(id=request.REQUEST.get('claim_id'))
        response['version_id'] = claim.adopted_version().id
        response['reword_flags'] = render_to_string('phase4/claim-tags.html',
                                                    _get_flags(request,
                                                               claim.adopted_version(),
                                                               'reword'))
        response['merge_flags'] = render_to_string('phase4/claim-tags.html',
                                                   _get_flags(request, claim,
                                                              'merge'))
        response['themes'] = render_to_string('phase4/claim-tags.html',
                                              _get_flags(request, claim,
                                                         'theme'))
        return HttpResponse(json.dumps(response), mimetype='application/json')
    if action == 'load_all':
        forum = Forum.objects.get(id=request.session['forum_id'])
        claims = Claim.objects.filter(forum=forum, is_deleted=False,
                                      published=True)
        for claim in claims:
            version_id = claim.adopted_version().id
            response[version_id] = {
                'reword_flags': render_to_string('phase4/claim-tags.html',
                                                 _get_flags(request,
                                                            claim.adopted_version(),
                                                            'reword'))}
            response[claim.id] = {
                'merge_flags': render_to_string('phase4/claim-tags.html',
                                                _get_flags(request, claim,
                                                           'merge')),
                'themes': render_to_string('phase4/claim-tags.html',
                                           _get_flags(request, claim, 'theme'))}
        return HttpResponse(json.dumps(response), mimetype='application/json')


def _get_flags(request, entry, action):
    context = {}
    if 'actual_user_id' in request.session:
        actual_author = User.objects.get(id=request.session['actual_user_id'])
    else:
        actual_author = None
    if 'reword' == action:
        context['version_id'] = entry.id
        reword_people = [vote.user.get_full_name() for vote in
                         entry.events.filter(vote__vote_type='reword',
                                             collective=False)]  # ignore collective ones
        context['reword'] = {'reword_people': ', '.join(reword_people),
                             'reword_cnt': len(reword_people), }
        if actual_author:
            context['reword']['i_voted'] = actual_author in [vote.user for vote
                                                             in
                                                             entry.events.filter(
                                                                 vote__vote_type='reword',
                                                                 collective=False)]  # ignore collective ones
        else:
            context['reword']['i_voted'] = request.user in [vote.user for vote
                                                            in
                                                            entry.events.filter(
                                                                vote__vote_type='reword',
                                                                collective=False)]  # ignore collective ones
    if 'merge' == action:
        context['claim_id'] = entry.id
        # must assert that entry has been suggested for merging for only once.
        merged_by = [vote.user.get_full_name() for vote in
                     entry.events.filter(vote__vote_type='merge',
                                         collective=False)]  # ignore collective ones
        if len(merged_by):
            vote = entry.events.get(vote__vote_type='merge')
            entry_ids = Vote.objects.filter(user=vote.user,
                                            created_at=vote.created_at).values_list(
                'entry__id',
                flat=True)
            context['merge'] = {'entry_ids': '.'.join(
                [str(entry_id) for entry_id in entry_ids]),
                                'merge_person': vote.user.get_full_name(), }
            if actual_author:
                context['merge']['i_voted'] = actual_author == vote.user
            else:
                context['merge']['i_voted'] = request.user == vote.user
    if 'theme' == action:
        context['claim_id'] = entry.id
        forum = Forum.objects.get(id=request.session['forum_id'])
        context['themes'] = []
        for theme in ClaimTheme.objects.filter(forum=forum):
            people = [themeassignment.user.get_full_name() for themeassignment
                      in
                      entry.events.filter(themeassignment__theme=theme,
                                          collective=False)]
            theme_info = {'id': theme.id, 'theme_name': theme.name,
                          'assignment_people': ', '.join(people),
                          'assignment_cnt': len(people), }
            if actual_author:
                theme_info['i_voted'] = actual_author in [themeassignment.user
                                                          for themeassignment in
                                                          entry.events.filter(
                                                              themeassignment__theme=theme,
                                                              collective=False)]
            else:
                theme_info['i_voted'] = request.user in [themeassignment.user
                                                         for themeassignment in
                                                         entry.events.filter(
                                                             themeassignment__theme=theme,
                                                             collective=False)]
            context['themes'].append(theme_info)
    return context


def api_claim_flag(request):
    response = {}
    if not request.user.is_authenticated():
        return HttpResponse("Please log in first.", status=403)
    action = request.REQUEST.get('action')
    if 'actual_user_id' in request.session:
        actual_author = User.objects.get(id=request.session['actual_user_id'])
    else:
        actual_author = None
    if action == 'flag':  # flagging a ClaimVersion
        flag_type = request.REQUEST.get(
            'flag_type')  # whether we use claim_id or version_id, it depends on flag_type
        deflag = request.REQUEST.get('deflag')
        now = timezone.now()
        if flag_type == 'reword':
            claim_version = ClaimVersion.objects.get(
                id=request.REQUEST.get('version_id'))
            collective = request.REQUEST.get('collective')
            reason = request.REQUEST.get('reason')
            if collective == 'true':  # impossible to deflag
                if actual_author:
                    Vote.objects.create(user=actual_author,
                                        delegator=request.user,
                                        entry=claim_version, created_at=now,
                                        vote_type='reword', reason=reason,
                                        collective=True)
                else:
                    Vote.objects.create(user=request.user, entry=claim_version,
                                        created_at=now, vote_type='reword',
                                        reason=reason, collective=True)
            else:
                if actual_author:
                    Vote.objects.filter(user=actual_author, entry=claim_version,
                                        vote_type=flag_type).delete()
                    if deflag == 'false':
                        Vote.objects.create(user=actual_author,
                                            delegator=request.user,
                                            entry=claim_version,
                                            created_at=now, vote_type='reword',
                                            reason=reason)
                else:
                    Vote.objects.filter(user=request.user, entry=claim_version,
                                        vote_type=flag_type).delete()
                    if deflag == 'false':
                        Vote.objects.create(user=request.user,
                                            entry=claim_version, created_at=now,
                                            vote_type='reword',
                                            reason=reason)
            response['html'] = render_to_string("phase4/claim-tags.html",
                                                _get_flags(request,
                                                           claim_version,
                                                           'reword'))
        elif flag_type == 'merge':
            if deflag == 'false':
                claim_ids = request.REQUEST.get('claim_ids').split()
                for claim_id in claim_ids:
                    if actual_author:
                        Vote.objects.create(user=actual_author,
                                            delegator=request.user,
                                            entry=Claim.objects.get(
                                                id=claim_id), created_at=now,
                                            vote_type='merge')
                    else:
                        Vote.objects.create(user=request.user,
                                            entry=Claim.objects.get(
                                                id=claim_id), created_at=now,
                                            vote_type='merge')
                        # doesn't need to return html -- LoadFlags will be called
            else:
                claim = Claim.objects.get(id=request.REQUEST.get('claim_id'))
                if actual_author:
                    timestamp = Vote.objects.get(user=actual_author,
                                                 entry=claim,
                                                 vote_type='merge').created_at
                    Vote.objects.filter(user=actual_author,
                                        created_at=timestamp).delete()
                else:
                    timestamp = Vote.objects.get(user=request.user, entry=claim,
                                                 vote_type='merge').created_at
                    Vote.objects.filter(user=request.user,
                                        created_at=timestamp).delete()
                response['html'] = render_to_string("phase4/claim-tags.html",
                                                    _get_flags(request, claim,
                                                               'merge'))
        return HttpResponse(json.dumps(response), mimetype='application/json')
    if action == 'theme':  # thematizing a Claim
        claim = Claim.objects.get(id=request.REQUEST.get('claim_id'))
        theme = ClaimTheme.objects.get(id=request.REQUEST.get('theme_id'))
        detheme = request.REQUEST.get('detheme')
        collective = request.REQUEST.get('collective')
        now = timezone.now()
        if collective == 'true':
            claim.theme = theme
            claim.save()
            if actual_author:
                ThemeAssignment.objects.create(user=actual_author,
                                               delegator=request.user,
                                               entry=claim, created_at=now,
                                               theme=theme, collective=True)
            else:
                ThemeAssignment.objects.create(user=request.user, entry=claim,
                                               created_at=now, theme=theme,
                                               collective=True)
        else:
            if actual_author:
                ThemeAssignment.objects.filter(user=actual_author, entry=claim,
                                               theme=theme).delete()
            else:
                ThemeAssignment.objects.filter(user=request.user, entry=claim,
                                               theme=theme).delete()
            if detheme == 'false':
                if actual_author:
                    ThemeAssignment.objects.create(user=actual_author,
                                                   delegator=request.user,
                                                   entry=claim,
                                                   created_at=now, theme=theme)
                else:
                    ThemeAssignment.objects.create(user=request.user,
                                                   entry=claim, created_at=now,
                                                   theme=theme)
        response['html'] = render_to_string("phase4/claim-tags.html",
                                            _get_flags(request, claim, 'theme'))
        return HttpResponse(json.dumps(response), mimetype='application/json')


def api_claim_vote(request):
    response = {}
    action = request.REQUEST.get('action')
    if 'actual_user_id' in request.session:
        actual_author = User.objects.get(id=request.session['actual_user_id'])
    else:
        actual_author = None
    if action == 'vote':
        if not request.user.is_authenticated():
            return HttpResponse("Please log in first.", status=403)
        # categorizing is targeted at a claim
        claim = Claim.objects.get(id=request.REQUEST.get('claim_id'))
        unvote = request.REQUEST.get('unvote')
        vote_type = request.REQUEST.get('type')
        if unvote == 'true':
            if actual_author:
                Vote.objects.filter(user=actual_author, entry=claim,
                                    vote_type=vote_type).delete()
            else:
                Vote.objects.filter(user=request.user, entry=claim,
                                    vote_type=vote_type).delete()
        else:
            if vote_type == 'pro' or vote_type == 'con' or vote_type == 'finding' or vote_type == 'discarded':  # mutual exclusive
                for v in ['pro', 'con', 'finding', 'discarded']:
                    if actual_author:
                        Vote.objects.filter(user=actual_author, entry=claim,
                                            vote_type=v).delete()
                    else:
                        Vote.objects.filter(user=request.user, entry=claim,
                                            vote_type=v).delete()
            if actual_author:
                Vote.objects.create(user=actual_author, delegator=request.user,
                                    entry=claim, vote_type=vote_type,
                                    created_at=timezone.now())
            else:
                Vote.objects.create(user=request.user, entry=claim,
                                    vote_type=vote_type,
                                    created_at=timezone.now())
        # after voting, return latest votes on the claim
        if actual_author:
            response['voters'] = _get_claim_votes(actual_author, claim)
        else:
            response['voters'] = _get_claim_votes(request.user, claim)
        return HttpResponse(json.dumps(response), mimetype='application/json')
    if action == 'load_single':
        claim = Claim.objects.get(id=request.REQUEST.get('claim_id'))
        if actual_author:
            response['voters'] = _get_claim_votes(actual_author, claim)
        else:
            response['voters'] = _get_claim_votes(request.user, claim)
        return HttpResponse(json.dumps(response), mimetype='application/json')
    if action == 'load_all':
        forum = Forum.objects.get(id=request.session['forum_id'])
        claims = Claim.objects.filter(forum=forum, is_deleted=False,
                                      published=True)
        for claim in claims:
            if actual_author:
                response[claim.id] = _get_claim_votes(actual_author, claim)
            else:
                response[claim.id] = _get_claim_votes(request.user, claim)
        return HttpResponse(json.dumps(response), mimetype='application/json')
    if action == 'load version':
        claim_version = ClaimVersion.objects.get(
            id=request.REQUEST.get('version_id'))
        if actual_author:
            response['voters'] = _get_version_votes(actual_author,
                                                    claim_version)
        else:
            response['voters'] = _get_version_votes(request.user, claim_version)
        return HttpResponse(json.dumps(response), mimetype='application/json')
    if action == 'like version':
        if not request.user.is_authenticated():
            return HttpResponse("Please log in first.", status=403)
        claim_version = ClaimVersion.objects.get(
            id=request.REQUEST.get('version_id'))
        unvote = request.REQUEST.get('unvote')
        if actual_author:
            if unvote == 'true':
                Vote.objects.filter(user=actual_author, entry=claim_version,
                                    vote_type='like').delete()
            else:
                Vote.objects.create(user=actual_author, delegator=request.user,
                                    entry=claim_version, vote_type='like',
                                    created_at=timezone.now())
            response['voters'] = _get_version_votes(actual_author,
                                                    claim_version)
        else:
            if unvote == 'true':
                Vote.objects.filter(user=request.user, entry=claim_version,
                                    vote_type='like').delete()
            else:
                Vote.objects.create(user=request.user, entry=claim_version,
                                    vote_type='like', created_at=timezone.now())
            response['voters'] = _get_version_votes(request.user, claim_version)
        return HttpResponse(json.dumps(response), mimetype='application/json')
    if action == 'adopt':
        version = ClaimVersion.objects.get(id=request.REQUEST.get('version_id'))
        version.is_adopted = True
        version.save()
        return HttpResponse(json.dumps(response), mimetype='application/json')
    if action == 'deadopt':
        version = ClaimVersion.objects.get(id=request.REQUEST.get('version_id'))
        version.is_adopted = False
        version.save()
        return HttpResponse(json.dumps(response), mimetype='application/json')
