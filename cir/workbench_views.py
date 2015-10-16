import json

from django.template.loader import render_to_string
from django.http import HttpResponse
from django.utils import timezone

from cir.models import *
import claim_views

def api_load_all_documents(request):
    response = {}
    context = {}
    context["docs"] = []
    forum = Forum.objects.get(id=request.session['forum_id'])
    # retrieve docs in a folder
    docs = Doc.objects.filter(forum_id=request.session['forum_id'])
    for doc in docs:
        doc_attr = {}
        doc_attr['folder'] = doc.folder
        doc_attr['title'] = doc.title
        doc_attr['sections'] = []
        ordered_sections = doc.sections.filter(order__isnull=False).order_by('order')
        for section in ordered_sections:
            doc_attr['sections'].append(section.getAttr(forum))
        unordered_sections = doc.sections.filter(order__isnull=True).order_by('updated_at')
        for section in unordered_sections:
            doc_attr['sections'].append(section.getAttr(forum))
        context["docs"].append(doc_attr);
        response['workbench_document'] = render_to_string("workbench-documents.html", context)
    return HttpResponse(json.dumps(response), mimetype='application/json')

def api_get_toc(request):
    response = {}
    context = {}
    # retrieve docs in a folder
    folders = EntryCategory.objects.filter(forum_id=request.session['forum_id'], category_type='doc')
    context['folders'] = []
    for folder in folders:
        m_folder = {}
        m_folder['name'] = folder.name
        m_folder['content'] = [] 
        docs = Doc.objects.filter(folder=folder)
        for doc in docs:
            m_doc = {}
            m_doc['name'] = doc.title
            m_doc['content'] = []
            for section in doc.sections.all():
                m_sec = {}
                m_sec["name"] = section.title
                m_sec["id"] = section.id
                m_doc['content'].append(m_sec)
            m_folder['content'].append(m_doc)
        context['folders'].append(m_folder)
    # retrieve docs not in any folder
    context['root_docs'] = []
    root_docs = Doc.objects.filter(forum_id=request.session['forum_id'], folder__isnull=True)
    for doc in root_docs:
        m_doc = {}
        m_doc['name'] = doc.title
        m_doc['content'] = []
        for section in doc.sections.all():
            m_sec = {}
            m_sec["name"] = section.title
            m_sec["id"] = section.id
            m_doc['content'].append(m_sec)
        context['root_docs'].append(m_doc)
    response['document_toc'] = render_to_string("document-toc.html", context)
    return HttpResponse(json.dumps(response), mimetype='application/json')

def add_nugget_comment(request):
    response = {}
    context = {}
    context['nugget_comments'] = []
    author = request.user
    forum_id = request.session['forum_id']
    theme_id = request.REQUEST.get('theme_id')
    content = request.REQUEST.get('content')
    now = timezone.now()
    nugget_comments = NuggetComment.objects.filter(forum_id = forum_id, theme_id = theme_id).order_by('-created_at')
    if (content != ""):
        newNuggetComment = NuggetComment(author = author, forum_id = forum_id, theme_id = theme_id, content = content, created_at = now)
        newNuggetComment.save()
        nugget_comments = NuggetComment.objects.filter(forum_id = forum_id, theme_id = theme_id).order_by('-created_at')
    for nugget_comment in nugget_comments:
        context['nugget_comments'].append(nugget_comment)
    response['workbench_nugget_comments'] = render_to_string("workbench_nugget_comments.html", context)
    return HttpResponse(json.dumps(response), mimetype='application/json')

def api_load_all_themes(request):
    response = {}
    context = {}
    themes = ClaimTheme.objects.filter(forum_id=request.session['forum_id'])
    context["themes"] = []
    for theme in themes:
        context["themes"].append(theme)
    response['workbench_container'] = render_to_string("workbench-container.html", context)
    return HttpResponse(json.dumps(response), mimetype='application/json')

def api_load_highlights(request):
    print "api_load_highlights"
    response = {}
    docs = Doc.objects.filter(forum_id=request.session['forum_id'])
    response['highlights'] = []
    theme_id = request.REQUEST.get('theme_id')
    if theme_id == "-1":
        for doc in docs:
            for section in doc.sections.all():
                highlights = section.highlights.all()
                for highlight in highlights:
                    highlight_info = highlight.getAttr()
                    response['highlights'].append(highlight_info)
    else:
        for doc in docs:
            for section in doc.sections.all():
                highlights = section.highlights.all()
                for highlight in highlights:
                    if (highlight.theme != None and int(highlight.theme.id) == int(theme_id)):
                        highlight_info = highlight.getAttr()
                        response['highlights'].append(highlight_info)
    return HttpResponse(json.dumps(response), mimetype='application/json')

def api_remove_nugget(request):
    print "api_change_to_nugget"
    response = {}
    context = {}
    hl_id = request.REQUEST.get("hl_id")
    hl = Highlight.objects.get(id = hl_id)
    hl.is_nugget = False
    hl.save()
    docs = Doc.objects.filter(forum_id=request.session["forum_id"])
    context['highlights'] = []
    for doc in docs:
        for section in doc.sections.all():
            highlights = section.highlights.filter(is_nugget = True)
            for highlight in highlights:
                context['highlights'].append(highlight.getAttr())
    response['workbench_nuggets'] = render_to_string("workbench-nuggets.html", context)
    return HttpResponse(json.dumps(response), mimetype='application/json')

def api_add_claim(request):
    response = {}
    content = request.REQUEST.get('content')
    theme_id = request.REQUEST.get('theme_id')
    data_hl_ids = request.REQUEST.get('data_hl_ids')
    category = request.REQUEST.get('category')
    now = timezone.now()
    if 'actual_user_id' in request.session:
        actual_author = User.objects.get(id=request.session['actual_user_id'])
    else:
        actual_author = None
    if actual_author:
        newClaim = Claim(forum_id=request.session['forum_id'], author=actual_author, delegator=request.user,
            created_at=now, updated_at=now, theme_id=theme_id, claim_category=category)
    else:
        newClaim = Claim(forum_id=request.session['forum_id'], author=request.user, created_at=now, updated_at=now,
            theme_id=theme_id, claim_category=category)
    newClaim.save()
    if actual_author:
        claim_version = ClaimVersion(forum_id=request.session['forum_id'], author=actual_author, delegator=request.user,
            content=content, created_at=now, updated_at=now, claim=newClaim)
    else:
        claim_version = ClaimVersion(forum_id=request.session['forum_id'], author=request.user, content=content,
            created_at=now, updated_at=now, claim=newClaim)
    claim_version.save()
    print "1111"
    data_hl_ids = data_hl_ids.strip()
    data_hl_ids_set = data_hl_ids.split(" ")
    print "2222"
    for data_hl_id in data_hl_ids_set:
        print data_hl_id
        newHighlightClaim = HighlightClaim(claim_id=newClaim.id, highlight_id=data_hl_id)
        newHighlightClaim.save()
    return HttpResponse(json.dumps(response), mimetype='application/json')

def api_change_to_nugget(request):
    print "api_change_to_nugget"
    response = {}
    context = {}
    data_hl_ids = request.REQUEST.get("data_hl_ids").split(" ")
    for data_hl_id in data_hl_ids:
        hl = Highlight.objects.get(id = data_hl_id)
        hl.is_nugget = True
        hl.save()
    docs = Doc.objects.filter(forum_id=request.session["forum_id"])
    context['highlights'] = []
    for doc in docs:
        for section in doc.sections.all():
            highlights = section.highlights.filter(is_nugget = True)
            for highlight in highlights:
                context['highlights'].append(highlight.getAttr())
    response['workbench_nuggets'] = render_to_string("workbench-nuggets.html", context)
    return HttpResponse(json.dumps(response), mimetype='application/json')

def api_get_claim_by_theme(request):
    forum = Forum.objects.get(id=request.session['forum_id'])
    response = {}
    context = {}
    context["finding"] = []
    context["pro"] = []
    context["con"] = []
    theme_id = request.REQUEST.get('theme_id')
    claims = Claim.objects.filter(theme_id=theme_id)
    for claim in claims:
        if (claim.claim_category == "finding"):
            context["finding"].append(claim)
        if (claim.claim_category == "pro"):
            context["pro"].append(claim)
        if (claim.claim_category == "con"):
            context["con"].append(claim)
    context['highlights'] = []
    docs = Doc.objects.filter(forum_id=request.session['forum_id'])
    for doc in docs:
        for section in doc.sections.all():
            highlights = section.highlights.filter(is_nugget = True, theme_id=theme_id)
            for highlight in highlights:
                context['highlights'].append(highlight.getAttr())
    response['workbench_claims'] = render_to_string("workbench-claims.html", context)
    return HttpResponse(json.dumps(response), mimetype='application/json')   

def api_others(request):  
    response = {}
    action = request.REQUEST.get('action')
    if action == 'create':
        if not request.user.is_authenticated():
            return HttpResponse("Please log in first.", status=403)
        content = request.REQUEST.get('content')
        content_type = request.REQUEST.get('type')
        start = request.REQUEST.get('start')
        end = request.REQUEST.get('end')
        context_id = request.REQUEST.get('contextId')
        # create highlight object
        context = Entry.objects.get(id=context_id)
        highlight = Highlight(start_pos=start, end_pos=end, context=context, author=request.user)
        highlight.save()
        response['highlight_id'] = highlight.id
        # then create the content
        now = timezone.now()
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
            claim_views._add_claim(request, highlight)
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
        response['html'] = render_to_string('doc-tag-area.html', {'mytags': mytags, 'alltags': alltags})
        return HttpResponse(json.dumps(response), mimetype='application/json')

def api_annotation(request):
    response = {}
    action = request.REQUEST.get('action')
    if action == 'load-thread':
        forum = Forum.objects.get(id=request.session['forum_id'])
        highlight_id = request.REQUEST.get('highlight_id')
        highlight = Highlight.objects.get(id=highlight_id)
        context = {}
        context['forum_phase'] = forum.phase
        context['entries'] = []
        posts = highlight.posts_of_highlight.all()
        for post in posts:
            for comment in post.getTree():
                context['entries'].append(comment.getAttr(forum))
        claims = highlight.claim_set.all()
        for claim in claims:
            context['entries'].append(claim.getAttr(forum))
        context['entries'] = sorted(context['entries'], key=lambda en: en['created_at_full'], reverse=True)
        response['html'] = render_to_string("activity-feed-doc.html", context)
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
        reply_type = request.REQUEST.get('reply_type')
        if reply_type:  # replying another post, or event
            reply_id = request.REQUEST.get('reply_id')
            if reply_type == 'event':
                event = Event.objects.get(id=reply_id)
                newPost.target_event = event
            elif reply_type == 'entry':
                entry = Entry.objects.get(id=reply_id)
                newPost.target_entry = entry
        else:  # targeting at a highlight or a claim
            source = request.REQUEST.get('type')
            if source == 'highlight':
                highlight = Highlight.objects.get(id=request.REQUEST.get('highlight_id'))
                newPost.highlight = highlight
            elif source == 'claim':
                claim = Claim.objects.get(id=request.REQUEST.get('claim_id'))
                newPost.target_entry = claim
        collective = request.REQUEST.get('collective')
        if collective == 'true':
            newPost.collective = True
        else:
            newPost.collective = False
        newPost.save()
        return HttpResponse(json.dumps(response), mimetype='application/json')
    if action == 'delete':
        entry_id = request.REQUEST.get('entry_id')
        now = timezone.now()
        post = Post.objects.get(id=entry_id)
        post.is_deleted = True
        post.updated_at = now
        post.save()
        return HttpResponse(json.dumps(response), mimetype='application/json')

