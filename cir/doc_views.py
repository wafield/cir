import json

from django.template.loader import render_to_string
from django.http import HttpResponse
from django.utils import timezone

from cir.models import *

def api_doc(request):
    response = {}
    action = request.REQUEST.get('action')
    forum = Forum.objects.get(id=request.session['forum_id'])
    if action == 'get-categories':
        context = {}
        # try:
        context['forum_name'] = forum.full_name
        # retrieve docs in a folder
        folders = EntryCategory.objects.filter(forum_id=request.session['forum_id'], category_type='doc')
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
        root_docs = Doc.objects.filter(forum_id=request.session['forum_id'], folder__isnull=True).order_by("order")
        for doc in root_docs:
            context['root_docs'].append(doc.getAttr())

        # retrieve aggregated tags
        tags_count = {}
        context['tags'] = []
        all_sections = DocSection.objects.filter(forum_id=request.session['forum_id'])
        for section in all_sections:
            for tag in Tag.objects.filter(context=section):
                if tag.content in tags_count:
                    tags_count[tag.content] += 1
                else:
                    tags_count[tag.content] = 1
        tags = sorted(tags_count, key=tags_count.get, reverse=True)
        for tag in tags:
            context['tags'].append({'content': tag, 'count': tags_count[tag]})
        response['html'] = render_to_string("doc/doc-category.html", context)
        return HttpResponse(json.dumps(response), mimetype='application/json')
        # except:
        #     return HttpResponse('Unknown error.', status=403)
    if action == 'get-document':
        doc_id = request.REQUEST.get('doc_id')
        try:
            doc = Doc.objects.get(id=doc_id)
            context = {}
            context['forum_phase'] = forum.phase
            context['title'] = doc.title
            context['sections'] = []
            ordered_sections = doc.sections.filter(order__isnull=False).order_by('order')
            for section in ordered_sections:
                context['sections'].append(section.getAttr(forum))
            unordered_sections = doc.sections.filter(order__isnull=True).order_by('updated_at')
            for section in unordered_sections:
                context['sections'].append(section.getAttr(forum))
            response['html'] = render_to_string("doc/doc-content.html", context)
            return HttpResponse(json.dumps(response), mimetype='application/json')
        except:
            return HttpResponse('The document does not exist.', status=403)

def api_highlight(request):
    response = {}
    action = request.REQUEST.get('action')
    now = timezone.now()
    if action == 'create':
        nugget_status = request.REQUEST.get('nugget_status')
        if (nugget_status == 'new'):
            if not request.user.is_authenticated():
                return HttpResponse("Please log in first.", status=403)
            content = request.REQUEST.get('content')
            content_type = request.REQUEST.get('type')
            start = request.REQUEST.get('start')
            end = request.REQUEST.get('end')
            context_id = request.REQUEST.get('contextId')
            text = request.REQUEST.get('text')
            # create highlight object
            context = Entry.objects.get(id=context_id)
            hl_type = request.REQUEST.get('hl_type')
            if (hl_type == "question"):
                highlight = Highlight(start_pos=start, end_pos=end, context=context, author=request.user, text=text, created_at = now, is_nugget = False)
            else: # real nugget
                highlight = Highlight(start_pos=start, end_pos=end, context=context, author=request.user, text=text, created_at = now, is_nugget = True)
            # if (request.REQUEST.get('theme_id')):
            #     theme_id = request.REQUEST.get('theme_id')
            #     highlight.theme = ClaimTheme.objects.get(id = theme_id)
            highlight.save()
            response['highlight_id'] = highlight.id
            # then create the content
            
            if 'actual_user_id' in request.session:
                actual_author = User.objects.get(id=request.session['actual_user_id'])
            else:
                actual_author = None
            if content_type == 'comment':
                if actual_author:
                    Post.objects.create(forum_id=request.session['forum_id'], author=actual_author, delegator=request.user,
                        content=content, created_at=now, updated_at=now, highlight=highlight, content_type='comment')
                else:
                    Post.objects.create(forum_id=request.session['forum_id'], author=request.user, content=content,
                        created_at=now, updated_at=now, highlight=highlight, content_type='comment')
            elif content_type == 'question':
                if actual_author:
                    Post.objects.create(forum_id=request.session['forum_id'], author=actual_author, delegator=request.user,
                        content=content, created_at=now, updated_at=now, highlight=highlight, content_type='question')
                else:
                    Post.objects.create(forum_id=request.session['forum_id'], author=request.user, content=content,
                        created_at=now, updated_at=now, highlight=highlight, content_type='question')
            elif content_type == 'claim':
                print ""
            # 2016/11/30: now a nugget is directly converted to a claim
            category = request.REQUEST.get('category')
            now = timezone.now()
            newClaim = Claim(forum_id=request.session['forum_id'], author=request.user, created_at=now, updated_at=now, content=content, claim_category=category)
            newClaim.save()
            claim_version = ClaimVersion(
                forum_id=request.session['forum_id'],
                author=request.user,
                content=text,
                created_at=now,
                updated_at=now,
                claim=newClaim,
                is_adopted=True)
            claim_version.save()
            newHighlightClaim = HighlightClaim(claim_id=newClaim.id, highlight_id=highlight.id)
            newHighlightClaim.save()
            claim = newClaim
        else: # if (nugget_status == 'exist'):
            nugget_id = request.REQUEST['nugget_id'].split(" ")[0]
            claim = HighlightClaim.objects.filter(highlight_id= Highlight.objects.get(id=nugget_id))[0].claim
        slot = Claim.objects.get(id=request.REQUEST['slot_id'])

        # create the link from source claim (newly added nugget) to target claim (question slot).
        if not ClaimReference.objects.filter(refer_type='stmt', from_claim=claim, to_claim=slot).exists():
            ClaimReference.objects.create(refer_type='stmt', from_claim=claim, to_claim=slot)

        # add entry of claim assignment activity to the slot.
        if 'actual_user_id' in request.session:
            actual_author = User.objects.get(id=request.session['actual_user_id'])
            SlotAssignment.objects.create(forum_id=request.session['forum_id'], user=actual_author, delegator=request.user,
                entry=claim, created_at=now, slot=slot, event_type='add')
        else:
            SlotAssignment.objects.create(forum_id=request.session['forum_id'], user=request.user,
                entry=claim, created_at=now, slot=slot, event_type='add')
        response["slot_id"] = slot.id
        response["slot_order"] = slot.stmt_order
        return HttpResponse(json.dumps(response), mimetype='application/json')
    if action == 'load-doc':
        doc_id = request.REQUEST.get('doc_id')
        doc = Doc.objects.get(id=doc_id)
        response['highlights'] = []
        mytags = set()
        alltags = set()
        for section in doc.sections.all():
            highlights = section.highlights.all()
            for highlight in highlights:
                highlight_info = highlight.getAttr()
                response['highlights'].append(highlight_info)
                if highlight_info['type'] == 'tag':
                    if highlight_info['author_id'] == request.user.id:
                        mytags.add(highlight_info['content'])
                    alltags.add(highlight_info['content'])
        response['html'] = render_to_string('doc/doc-tag-area.html', {'mytags': mytags, 'alltags': alltags})
        return HttpResponse(json.dumps(response), mimetype='application/json')

def api_annotation(request):
    response = {}
    action = request.REQUEST.get('action')
    forum = Forum.objects.get(id=request.session['forum_id'])
    if action == 'load-thread':
        context = {}
        highlight_id = request.REQUEST.get('highlight_id')
        highlight = Highlight.objects.get(id=highlight_id)
        if (highlight.is_nugget):
            context['theme'] = highlight.theme
            context['author'] = highlight.author
        context['forum_phase'] = forum.phase
        context['source'] = 'highlight'
        context['entries'] = []
        posts = highlight.posts_of_highlight.all()
        for post in posts:
            for comment in post.getTree(exclude_root=False):
                context['entries'].append(comment.getAttr(forum))
        claims = highlight.claim_set.all()
        for claim in claims:
            context['entries'].append(claim.getAttr(forum))
        context['entries'] = sorted(context['entries'], key=lambda en: en['created_at_full'], reverse=True)
        response['html'] = render_to_string("feed/activity-feed-doc.html", context)
        return HttpResponse(json.dumps(response), mimetype='application/json')
    if action == 'create':
        if not request.user.is_authenticated():
            return HttpResponse("Please log in first.", status=403)
        now = timezone.now()
        newPost = Post(forum_id=request.session['forum_id'], content_type='comment', created_at=now, updated_at=now)
        if 'actual_user_id' in request.session:
            newPost.author = User.objects.get(id=request.session['actual_user_id'])
            newPost.delegator = request.user
        else:
            newPost.author = request.user
        newPost.content = request.REQUEST.get('content')

        # depending on whether this post is a reply, decide who are to be notified
        request_action = request.REQUEST.get('request_action', 'false')
        request_action_bool = False
        if request_action == 'true':
            request_action_bool = True
        reply_type = request.REQUEST.get('reply_type')
        if reply_type:  # replying another post, or event
            reply_id = request.REQUEST.get('reply_id')
            if request_action_bool:
                message_type = 'reply-action'
            else:
                message_type = 'reply'

            if reply_type == 'event':
                event = Event.objects.get(id=reply_id)
                newPost.target_event = event
                receiver = event.user
            elif reply_type == 'entry':
                entry = Entry.objects.get(id=reply_id)
                newPost.target_entry = entry
                receiver = entry.author
            newPost.save()
            Message.objects.create(
                forum=forum,
                sender=newPost.author,
                receiver=receiver,
                content=newPost.content,
                created_at=now,
                content_type=message_type,
                target_entry=newPost
            )
        else:  # targeting at a highlight or a claim
            source = request.REQUEST.get('type')
            if source == 'highlight':
                highlight = Highlight.objects.get(id=request.REQUEST.get('highlight_id'))
                newPost.highlight = highlight
            elif source == 'claim':
                slot = Claim.objects.get(id=request.REQUEST.get('slot_id'))
                newPost.target_entry = slot
        collective = request.REQUEST.get('collective', 'false')
        if collective == 'true':
            newPost.collective = True
        else:
            newPost.collective = False
        newPost.save()

        if not reply_type: # notify everyone
            message_type = 'post'
            if request_action_bool:
                message_type = 'post-action'

            for panelist in forum.members.filter(role='panelist'):
                Message.objects.create(
                    forum=forum,
                    sender=newPost.author,
                    receiver=panelist.user,
                    content=newPost.content,
                    created_at=now,
                    content_type=message_type,
                    target_entry=newPost
                )
        return HttpResponse(json.dumps(response), mimetype='application/json')
    if action == 'delete':
        entry_id = request.REQUEST.get('entry_id')
        now = timezone.now()
        post = Post.objects.get(id=entry_id)
        post.is_deleted = True
        post.updated_at = now
        post.save()
        return HttpResponse(json.dumps(response), mimetype='application/json')

def api_qa(request):
    response = {}
    forum = Forum.objects.get(id=request.session['forum_id'])
    action = request.REQUEST.get('action')
    if action == 'load-thread':
        # given a question, load its discussions
        question = ClaimComment.objects.get(id=request.REQUEST.get('question_id'))
        context = {
            'entries': [],
            'source': 'qa'
        }
        comments = question.get_descendants(include_self=True)
        context["comments"] = question.get_descendants(include_self=True)
        response['html'] = render_to_string("qa/question-expand.html", context)
    if action == 'raise-question':
        author = request.user
        forum = Forum.objects.get(id=request.session['forum_id'])
        comment_type = "question"
        text = request.REQUEST.get('text')
        created_at = timezone.now()
        nugget_id = request.REQUEST.get('nugget_id')
        if (nugget_id == ""):
            newClaimComment = ClaimComment(author = author, text = text, created_at = created_at, comment_type = comment_type, forum = forum)
        else:
            newClaimComment = ClaimComment(author = author, text = text, created_at = created_at, comment_type = comment_type, forum = forum, nugget_id = nugget_id)
        newClaimComment.save()
    if action == 'get-question-list'  or action == 'raise-question':
        author = request.user
        context = {
            'questions': []
        }
        questions = ClaimComment.objects.filter(forum = forum, comment_type='question', parent__isnull = True)
        context['questions'] = context['questions']
        for question in questions:
            entry = {}
            entry["reply_count"] = question.get_descendant_count()
            if (entry["reply_count"] > 0):
                entry["last_reply_pretty"] = utils.pretty_date(question.get_descendants(include_self=True).order_by("-created_at")[0].created_at)
            entry["text"] = question.text
            entry["id"] = question.id
            entry["is_answered"] = question.is_answered
            entry["created_at"] = question.created_at
            entry['comments'] = question.get_descendants(include_self=True)
            entry["entry_type"] = "claim_" + str(question.comment_type)
            entry["author_name"] = question.author.first_name + " " + question.author.last_name
            entry["author_id"] = question.author.id
            entry["is_author"] = (question.author == request.user)
            if (Role.objects.filter(user_id = request.user.id, forum =forum).count == 0):
                entry["is_facilitator"] = (Role.objects.get(user = request.user, forum =forum).role) == "facilitator"
                entry["author_role"] = Role.objects.get(user = question.author, forum =forum).role
            entry["author_intro"] = UserInfo.objects.get(user = question.author).description
            entry["created_at_pretty"] = utils.pretty_date(question.created_at)
            # vote for importance
            entry["vote_count"] = ClaimQuestionVote.objects.filter(question_id = question.id).count()
            if (entry["vote_count"] > 0):
                tmp = []
                for vote in ClaimQuestionVote.objects.filter(question_id = question.id):
                    tmp.append(vote.voter.last_name + " " + vote.voter.first_name)
                entry["voted_authors"] = ", ".join(tmp)
            # vote for experts
            entry["expert_vote_count"] = QuestionNeedExpertVote.objects.filter(question_id = question.id).count()
            entry["has_facilitator_vote"] = False
            if (entry["expert_vote_count"] > 0):
                tmp = []
                for vote in QuestionNeedExpertVote.objects.filter(question_id = question.id):
                    tmp.append(vote.voter.last_name + " " + vote.voter.first_name)
                    if (Role.objects.get(user = vote.voter, forum =forum).role == "facilitator"):
                        entry["has_facilitator_vote"] = True
                entry["expert_voted_authors"] = ", ".join(tmp)
            if (ClaimQuestionVote.objects.filter(voter_id = author.id, question_id = question.id).count() > 0):
                entry["voted"] = True
            if (QuestionNeedExpertVote.objects.filter(voter_id = author.id, question_id = question.id).count() > 0):
                entry["expert_voted"] = True
            try:
                claimVersion = ClaimVersion.objects.filter(claim = question.claim, is_adopted = True).order_by("-created_at")[0]
                entry['claim_id'] = question.claim.id
                entry['claim_content'] = claimVersion.content
                entry['claim_author'] = question.claim.author.first_name + " " + question.claim.author.last_name
                entry['claim_created_at'] = utils.pretty_date(question.claim.created_at)
            except:
                pass
            if (question.nugget):
                docsection = DocSection.objects.get(id=question.nugget.context.id)
                entry['doc_id'] = docsection.doc.id
                entry['nugget_id'] = question.nugget.id
            context['questions'].append(entry)
        context['questions'] = sorted(context['questions'], key=lambda en: (en['is_answered'], en['created_at']), reverse=True)
        response['html'] = render_to_string('qa/question-list.html', context)
    return HttpResponse(json.dumps(response), mimetype='application/json')

# def api_qa_backup(request):
#     response = {}
#     forum = Forum.objects.get(id=request.session['forum_id'])
#     action = request.REQUEST.get('action')
#     if action == 'load-thread':
#         # given a question, load its discussions
#         question = Post.objects.get(id=request.REQUEST.get('question_id'))
#         context = {
#             'entries': [],
#             'source': 'qa'
#         }
#         for post in question.getTree(exclude_root=True): # don't include root
#             context['entries'].append(post.getAttr(forum))
#         context['entries'] = sorted(context['entries'], key=lambda en: en['created_at_full'], reverse=True)
#         response['html'] = render_to_string("feed/activity-feed-doc.html", context)
#     if action == 'raise-question':
#         now = timezone.now()
#         content = request.REQUEST.get('content')
#         Post.objects.create(forum_id=request.session['forum_id'], author=request.user, content=content,
#             created_at=now, updated_at=now, content_type='question')
#     if action == 'get-all-questions' or action == 'raise-question':
#         context = {
#             'questions': []
#         }
#         questions = Post.objects.filter(forum=forum, content_type='question', is_deleted=False)
#         for question in questions:
#             question_info = question.getAttr(forum)
#             all_replies = question.getTree(exclude_root=True)
#             question_info['treesize'] = len(all_replies)
#             if question_info['treesize'] > 0:
#                 last_reply = sorted(all_replies, key=lambda en: en.created_at, reverse=True)[0]
#                 last_reply_info = last_reply.getAttr(forum)
#                 question_info['last_reply'] = last_reply_info['updated_at']
#                 question_info['last_reply_full'] = last_reply_info['updated_at_full']
#             else:
#                 question_info['last_reply_full'] = question_info['created_at_full']
#             try:
#                 docsection = DocSection.objects.get(id=question.highlight.context.id)
#                 question_info['doc_name'] = docsection.doc.title
#                 question_info['doc_id'] = docsection.doc.id
#                 question_info['highlight_id'] = question.highlight.id
#             except:
#                 pass
#             context['questions'].append(question_info)
#         context['questions'] = sorted(context['questions'], key=lambda en: (en['last_reply_full'], en['created_at_full']), reverse=True)
#         response['html'] = render_to_string('doc/qa-panel.html', context)
#     return HttpResponse(json.dumps(response), mimetype='application/json')