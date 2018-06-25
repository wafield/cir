import json

from django.template.loader import render_to_string
from django.http import HttpResponse
from django.utils import timezone
from django.shortcuts import render_to_response

from cir.models import *
import claim_views

from cir.phase_control import PHASE_CONTROL
import utils


def get_nugget_comment_list(request):
    """
    Get thread of comments, given a claim (nugget).
    :param request:
    :return:
    """
    forum = Forum.objects.get(id=request.session['forum_id'])
    response = {}
    context = {}
    claim_id = request.REQUEST.get("claim_id")
    claim = Claim.objects.get(id=claim_id)
    thread_comments = ClaimComment.objects.filter(claim=claim)
    context['claim'] = claim.getAttr(forum)
    context['comments'] = thread_comments
    response['nugget_comment_list'] = render_to_string("phase1/nugget_comment_list.html", context)
    response['nugget_comment_highlight'] = render_to_string("phase1/nugget_comment_highlight.html", context)
    return HttpResponse(json.dumps(response), mimetype='application/json')


def put_nugget_comment(request):
    response = {}
    context = {}
    author = request.user
    parent_id = request.REQUEST.get('parent_id')
    highlight_id = request.REQUEST.get('highlight_id')
    text = request.REQUEST.get('text')
    created_at = timezone.now()
    highlight = Highlight.objects.get(id=highlight_id)
    if parent_id == "":  # root node
        newNuggetComment = NuggetComment(author=author, text=text, highlight=highlight, created_at=created_at)
    else:
        parent = NuggetComment.objects.get(id=parent_id)
        newNuggetComment = NuggetComment(author=author, text=text, highlight=highlight, parent=parent,
                                         created_at=created_at)
    newNuggetComment.save()
    return HttpResponse(json.dumps(response), mimetype='application/json')


def get_statement_comment_list(request):

    response = {}
    context = {}

    statement_id = request.REQUEST.get("statement_id")
    this_statement = ClaimVersion.objects.get(id=statement_id)
    thread_comments = StatementComment.objects.filter(claim_version=this_statement)
    context['comments'] = thread_comments
    response['statement_comment_list'] = render_to_string("phase1/statement-comment-list.html", context)
    return HttpResponse(json.dumps(response), mimetype='application/json')


def put_statement_comment(request):
    response = {}
    context = {}
    author = request.user
    parent_id = request.REQUEST.get('parent_id')
    statement_id = request.REQUEST.get('statement_id')
    text = request.REQUEST.get('text')
    created_at = timezone.now()
    statement = ClaimVersion.objects.get(id=statement_id)
    if parent_id == "":  # root node
        newStatementComment = StatementComment(author=author, text=text, claim_version=statement, created_at=created_at)
    else:
        parent = StatementComment.objects.get(id=parent_id)
        newStatementComment = StatementComment(author=author, text=text, claim_version=statement, parent=parent,
                                               created_at=created_at)
    newStatementComment.save()
    return HttpResponse(json.dumps(response), mimetype='application/json')


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
    # retrieve docs not in any folder
    context['root_docs'] = []
    root_docs = Doc.objects.filter(forum_id=request.session['forum_id'], folder__isnull=True).order_by("order")
    for doc in root_docs:
        m_doc = {}
        m_doc['name'] = doc.title
        m_doc['id'] = doc.id
        m_doc['content'] = []
        for section in doc.sections.all():
            m_sec = {}
            m_sec["name"] = section.title
            m_sec["id"] = section.id
            m_doc['content'].append(m_sec)
        m_doc['content'].sort(key=lambda x: x["id"])
        context['root_docs'].append(m_doc)
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
            m_doc['id'] = doc.id
            m_doc['content'] = []
            for section in doc.sections.all():
                m_sec = {}
                m_sec["name"] = section.title
                m_sec["id"] = section.id
                m_doc['content'].append(m_sec)
            m_doc['content'].sort(key=lambda x: x["id"])
            m_folder['content'].append(m_doc)
        context['folders'].append(m_folder)
    response['document_toc'] = render_to_string("document-toc.html", context)
    return HttpResponse(json.dumps(response), mimetype='application/json')


def api_get_doc_by_hl_id(request):
    response = {}
    context = {}
    forum = Forum.objects.get(id=request.session['forum_id'])
    # retrieve docs in a folder
    hl_id = request.REQUEST.get("hl_id")
    hl = Highlight.objects.get(id=hl_id)
    sec = DocSection.objects.get(id=hl.context.id)
    doc = sec.doc
    context['doc_name'] = doc.title
    context['sections'] = []
    context['doc_id'] = doc.id
    ordered_sections = doc.sections.filter(order__isnull=False).order_by('order')
    for section in ordered_sections:
        context['sections'].append(section.getAttr(forum))
    unordered_sections = doc.sections.filter(order__isnull=True).order_by('updated_at')
    for section in unordered_sections:
        context['sections'].append(section.getAttr(forum))
    response['workbench_document'] = render_to_string("workbench-document.html", context)
    response['doc_id'] = doc.id
    return HttpResponse(json.dumps(response), mimetype='application/json')


def api_get_doc_by_sec_id(request):
    response = {}
    context = {}
    forum = Forum.objects.get(id=request.session['forum_id'])
    # retrieve docs in a folder
    sec_id = request.REQUEST.get("sec_id")
    sec = DocSection.objects.get(id=sec_id)
    doc = sec.doc
    context['doc_name'] = doc.title
    context['sections'] = []
    context['doc_id'] = doc.id
    ordered_sections = doc.sections.filter(order__isnull=False).order_by('order')
    for section in ordered_sections:
        context['sections'].append(section.getAttr(forum))
    unordered_sections = doc.sections.filter(order__isnull=True).order_by('updated_at')
    for section in unordered_sections:
        context['sections'].append(section.getAttr(forum))
    response['workbench_document'] = render_to_string("workbench-document.html", context)
    response['doc_id'] = doc.id
    return HttpResponse(json.dumps(response), mimetype='application/json')


def api_get_doc_by_doc_id(request):
    response = {}
    context = {}
    forum = Forum.objects.get(id=request.session['forum_id'])
    # retrieve docs in a folder
    doc_id = request.REQUEST.get("doc_id")
    doc = Doc.objects.get(id=doc_id)
    context['doc_name'] = doc.title
    context['doc_id'] = doc.id
    context['sections'] = []
    ordered_sections = doc.sections.filter(order__isnull=False).order_by('order')
    for section in ordered_sections:
        context['sections'].append(section.getAttr(forum))
    unordered_sections = doc.sections.filter(order__isnull=True).order_by('updated_at')
    for section in unordered_sections:
        context['sections'].append(section.getAttr(forum))
    response['workbench_document'] = render_to_string("workbench-document.html", context)
    response['doc_id'] = doc.id
    return HttpResponse(json.dumps(response), mimetype='application/json')


def api_get_init_doc(request):
    response = {}
    context = {}
    forum = Forum.objects.get(id=request.session['forum_id'])
    # retrieve docs in a folder
    doc = Doc.objects.filter(forum_id=request.session['forum_id'], order__isnull=False).order_by('order')[0]
    doc_id = doc.id
    context['doc_name'] = doc.title
    context['doc_id'] = doc_id
    context['sections'] = []
    ordered_sections = doc.sections.filter(order__isnull=False).order_by('order')
    for section in ordered_sections:
        context['sections'].append(section.getAttr(forum))
    unordered_sections = doc.sections.filter(order__isnull=True).order_by('updated_at')
    for section in unordered_sections:
        context['sections'].append(section.getAttr(forum))
    response['workbench_document'] = render_to_string("workbench-document.html", context)
    response['doc_id'] = doc_id
    return HttpResponse(json.dumps(response), mimetype='application/json')


def get_theme_list(request):
    response = {}
    context = {}
    forum = Forum.objects.get(id=request.session['forum_id'])
    context['forum_name'] = forum.full_name
    context['forum_url'] = forum.url
    themes = ClaimTheme.objects.filter(forum_id=request.session['forum_id'])
    response["themes"] = []
    for theme in themes:
        item = {}
        item["name"] = theme.name
        item["id"] = theme.id
        response["themes"].append(item)
    context["phase"] = PHASE_CONTROL[forum.phase]

    return HttpResponse(json.dumps(response), mimetype='application/json')


def get_highlights(request):
    response = {}
    response['highlights'] = []
    doc_id = request.REQUEST.get('doc_id')
    doc = Doc.objects.get(id=doc_id)
    for section in doc.sections.all():
        highlights = section.highlights.all()
        for highlight in highlights:
            highlight_info = highlight.getAttr()
            highlight_info["doc_id"] = DocSection.objects.get(id=highlight.context.id).doc.id
            highlight_info["is_nugget"] = highlight.is_nugget
            highlight_info["used_in_slots"] = []
            if (HighlightClaim.objects.filter(highlight_id=Highlight.objects.get(id=highlight.id)).count() > 0):
                claim = HighlightClaim.objects.filter(highlight_id=Highlight.objects.get(id=highlight.id))[0].claim
                for ref in ClaimReference.objects.filter(refer_type='stmt', from_claim=claim):
                    slot = ref.to_claim
                    info = str(slot.claim_category.upper()[:1]) + "Q" + str(slot.stmt_order)
                    highlight_info["used_in_slots"].append(info)
            response['highlights'].append(highlight_info)
    return HttpResponse(json.dumps(response), mimetype='application/json')


def get_statement_version(request):
    response = {}
    context = {}
    claim_version_id = request.REQUEST.get('claim_version_id')
    statementVersions = StatementVersion.objects.filter(claim_version_id=claim_version_id).order_by('-updated_at')
    context['versions'] = []
    for statementVersion in statementVersions:
        item = {}
        item['text'] = statementVersion.text
        item['updated_at'] = utils.pretty_date(statementVersion.updated_at)
        item['author'] = statementVersion.author.first_name + " " + statementVersion.author.last_name
        context['versions'].append(item)
    response['html'] = render_to_string("phase1/statement-versions.html", context)
    return HttpResponse(json.dumps(response), mimetype='application/json')


def api_load_one_highlight(request):
    response = {}
    response['highlights'] = []
    hl_id = request.REQUEST.get('hl_id')
    hl = Highlight.objects.get(id=hl_id)
    highlight_info = hl.getAttr()
    response['highlight'] = highlight_info
    return HttpResponse(json.dumps(response), mimetype='application/json')


def api_remove_claim(request):
    response = {}
    claim_id = request.REQUEST.get('claim_id')
    c = Claim.objects.get(id=claim_id)
    c.delete()
    return HttpResponse(json.dumps(response), mimetype='application/json')


def put_claim(request):
    response = {}
    content = request.REQUEST.get('content')
    theme_id = request.REQUEST.get('theme_id')
    data_hl_ids = request.REQUEST.get('data_hl_ids')
    category = "pending"
    now = timezone.now()
    newClaim = Claim(forum_id=request.session['forum_id'], author=request.user, created_at=now, updated_at=now,
                     content=content, theme_id=theme_id, claim_category=category)
    newClaim.save()
    claim_version = ClaimVersion(forum_id=request.session['forum_id'], author=request.user, content=content,
                                 created_at=now, updated_at=now, claim=newClaim)
    claim_version.save()
    data_hl_ids_list = data_hl_ids.strip().split(" ")
    for data_hl_id in data_hl_ids_list:
        newHighlightClaim = HighlightClaim(claim_id=newClaim.id, highlight_id=data_hl_id)
        newHighlightClaim.save()
    return HttpResponse(json.dumps(response), mimetype='application/json')


def change_nugget_theme(request):
    highlight_id = request.REQUEST.get("highlight_id")
    theme_id = request.REQUEST.get("theme_id")
    highlight = Highlight.objects.get(id=highlight_id)
    highlight.theme_id = theme_id
    highlight.save()
    response = {}
    return HttpResponse(json.dumps(response), mimetype='application/json')


# nugget list zone
def api_change_to_nugget(request):
    # input: highlight_ids, output: set as nugget
    response = {}
    context = {}
    data_hl_ids = request.REQUEST.get("data_hl_ids").split(" ")
    for data_hl_id in data_hl_ids:
        hl = Highlight.objects.get(id=data_hl_id)
        hl.is_nugget = True
        hl.save()
    docs = Doc.objects.filter(forum_id=request.session["forum_id"])
    context['highlights'] = []
    for doc in docs:
        for section in doc.sections.all():
            highlights = section.highlights.filter(is_nugget=True)
            for highlight in highlights:
                context['highlights'].append(highlight.getAttr())
    response['workbench_nuggets'] = render_to_string("workbench-nuggets.html", context)
    return HttpResponse(json.dumps(response), mimetype='application/json')


def api_change_to_nugget_1(request):
    # input: highlight_id, output: one nugget
    response = {}
    context = {}
    data_hl_id = request.REQUEST.get("data_hl_id")
    hl = Highlight.objects.get(id=data_hl_id)
    hl.is_nugget = True
    hl.save()
    context['highlight'] = hl.getAttr()
    response['workbench_single_nugget'] = render_to_string("workbench-single-nugget.html", context)
    return HttpResponse(json.dumps(response), mimetype='application/json')


def api_remove_nugget(request):
    # input: highlight_ids, output: set as not nugget
    response = {}
    context = {}
    hl_id = request.REQUEST.get("hl_id")
    hl = Highlight.objects.get(id=hl_id)
    hl.is_nugget = False
    hl.save()
    context['highlight'] = hl.getAttr()
    response['workbench_single_nugget'] = render_to_string("workbench-single-nugget.html", context)
    return HttpResponse(json.dumps(response), mimetype='application/json')


def get_nugget_list(request):
    response = {}
    context = {}
    # theme_id = int(request.REQUEST.get("theme_id"))
    docs = Doc.objects.filter(forum_id=request.session["forum_id"])
    context['highlights'] = []
    for doc in docs:
        for section in doc.sections.all():
            highlights = section.highlights.all()
            for highlight in highlights:
                highlight_info = highlight.getAttr()
                highlight_info["doc_id"] = DocSection.objects.get(id=highlight.context.id).doc.id
                highlight_info["is_author"] = (highlight.author == request.user)
                highlight_info["author_intro"] = UserInfo.objects.get(user=highlight.author).description
                highlight_info["author_id"] = highlight.author.id
                # highlight_info["theme_desc"] = highlight.theme.description
                highlight_info["comment_number"] = NuggetComment.objects.filter(highlight_id=highlight.id).count()
                context['highlights'].append(highlight_info)
    context['highlights'].sort(key=lambda x: x["created_at"], reverse=True)
    response['workbench_nugget_list'] = render_to_string("phase1/nugget_list.html", context)
    return HttpResponse(json.dumps(response), mimetype='application/json')


def api_load_nugget_list_partial(request):
    response = {}
    context = {}
    context['highlights'] = []
    highlight_ids = request.REQUEST.get("highlight_ids")
    highlight_ids = highlight_ids.split()
    for highlight_id in highlight_ids:
        highlight = Highlight.objects.get(id=highlight_id)
        context['highlights'].append(highlight.getAttr())
    response['workbench_nugget_list'] = render_to_string("workbench-nuggets.html", context)
    return HttpResponse(json.dumps(response), mimetype='application/json')


def api_load_claim_list_partial(request):
    response = {}
    context = {}
    context['highlights'] = []
    highlight_id = request.REQUEST.get("highlight_id")
    highlightClaims = HighlightClaim.objects.filter(highlight_id=highlight_id)
    context["claims"] = []
    for highlightClaim in highlightClaims:
        claim = highlightClaim.claim
        item = {}
        item['date'] = utils.pretty_date(claim.updated_at)
        item['content'] = unicode(ClaimVersion.objects.filter(claim_id=claim.id)[0]) + " (" + claim.claim_category + ")"
        item['id'] = claim.id
        item['author_name'] = claim.author.first_name + " " + claim.author.last_name
        item['is_author'] = (request.user == claim.author)
        item['highlight_ids'] = ""
        for highlight in claim.source_highlights.all():
            item['highlight_ids'] += (str(highlight.id) + " ")
        item['highlight_ids'].strip(" ")
        context["claims"].append(item)
    response['workbench_claims'] = render_to_string("workbench-claims.html", context)
    return HttpResponse(json.dumps(response), mimetype='application/json')


def api_edit_claim(request):
    claim_id = request.REQUEST.get("claim_id")
    content = request.REQUEST.get("content")
    claim = Claim.objects.get(id=claim_id)
    claim.content = content
    claim.save()
    response = {}
    return HttpResponse(json.dumps(response), mimetype='application/json')


def get_claim_list(request):
    forum = Forum.objects.get(id=request.session['forum_id'])
    response = {}
    context = {}
    theme_id = int(request.REQUEST.get('theme_id'))
    if (theme_id > 0):
        claims = Claim.objects.filter(theme_id=theme_id)
    else:
        claims = Claim.objects.filter(forum=forum)
    context["claims"] = []
    for claim in claims:
        item = {}
        item['date'] = utils.pretty_date(claim.updated_at)
        item['created_at'] = utils.pretty_date(claim.created_at)
        item['created_at_used_for_sort'] = claim.created_at
        item['content'] = unicode(ClaimVersion.objects.filter(claim_id=claim.id)[0])
        item['id'] = claim.id
        item['author_name'] = claim.author.first_name + " " + claim.author.last_name
        item['is_author'] = (request.user == claim.author)
        item['highlight_ids'] = ""
        for highlight in claim.source_highlights.all():
            item['highlight_ids'] += (str(highlight.id) + " ")
        item['highlight_ids'].strip(" ")
        context["claims"].append(item)
    context['claims'].sort(key=lambda x: x["created_at_used_for_sort"], reverse=True)
    response['workbench_claims'] = render_to_string("phase2/claim_list.html", context)
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
                                    content=content, created_at=now, updated_at=now, highlight=highlight,
                                    content_type='comment')
            else:
                Post.objects.create(forum_id=request.session['forum_id'], author=request.user, content=content,
                                    created_at=now, updated_at=now, highlight=highlight, content_type='comment')
        elif content_type == 'question':
            if actual_author:
                Post.objects.create(forum_id=request.session['forum_id'], author=actual_author, delegator=request.user,
                                    content=content, created_at=now, updated_at=now, highlight=highlight,
                                    content_type='question')
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
