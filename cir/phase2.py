import json

from django.template.loader import render_to_string
from django.http import HttpResponse
from django.utils import timezone

from cir.models import *
import claim_views

from cir.phase_control import PHASE_CONTROL
import utils
import random


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
    ordered_sections = doc.sections.filter(order__isnull=False).order_by(
      'order')
    for section in ordered_sections:
      doc_attr['sections'].append(section.getAttr(forum))
    unordered_sections = doc.sections.filter(order__isnull=True).order_by(
      'updated_at')
    for section in unordered_sections:
      doc_attr['sections'].append(section.getAttr(forum))
    context["docs"].append(doc_attr);
    response['workbench_document'] = render_to_string(
      "workbench-documents.html", context)
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
  ordered_sections = doc.sections.filter(order__isnull=False).order_by(
    'order')
  for section in ordered_sections:
    context['sections'].append(section.getAttr(forum))
  unordered_sections = doc.sections.filter(order__isnull=True).order_by(
    'updated_at')
  for section in unordered_sections:
    context['sections'].append(section.getAttr(forum))
  response['workbench_document'] = render_to_string("workbench-document.html",
                                                    context)
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
  ordered_sections = doc.sections.filter(order__isnull=False).order_by(
    'order')
  for section in ordered_sections:
    context['sections'].append(section.getAttr(forum))
  unordered_sections = doc.sections.filter(order__isnull=True).order_by(
    'updated_at')
  for section in unordered_sections:
    context['sections'].append(section.getAttr(forum))
  response['workbench_document'] = render_to_string("workbench-document.html",
                                                    context)
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
  ordered_sections = doc.sections.filter(order__isnull=False).order_by(
    'order')
  for section in ordered_sections:
    context['sections'].append(section.getAttr(forum))
  unordered_sections = doc.sections.filter(order__isnull=True).order_by(
    'updated_at')
  for section in unordered_sections:
    context['sections'].append(section.getAttr(forum))
  response['workbench_document'] = render_to_string("workbench-document.html",
                                                    context)
  response['doc_id'] = doc.id
  return HttpResponse(json.dumps(response), mimetype='application/json')


def api_get_init_doc(request):
  response = {}
  context = {}
  forum = Forum.objects.get(id=request.session['forum_id'])
  # retrieve docs in a folder
  doc = Doc.objects.filter(forum_id=request.session['forum_id'],
                           order__isnull=False).order_by('order')[0]
  doc_id = doc.id
  context['doc_name'] = doc.title
  context['doc_id'] = doc_id
  context['sections'] = []
  ordered_sections = doc.sections.filter(order__isnull=False).order_by(
    'order')
  for section in ordered_sections:
    context['sections'].append(section.getAttr(forum))
  unordered_sections = doc.sections.filter(order__isnull=True).order_by(
    'updated_at')
  for section in unordered_sections:
    context['sections'].append(section.getAttr(forum))
  response['workbench_document'] = render_to_string("workbench-document.html",
                                                    context)
  response['doc_id'] = doc_id
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
  nugget_comments = NuggetComment.objects.filter(forum_id=forum_id,
                                                 theme_id=theme_id).order_by(
    'created_at')
  if (content != ""):
    newNuggetComment = NuggetComment(author=author, forum_id=forum_id,
                                     theme_id=theme_id, content=content,
                                     created_at=now)
    newNuggetComment.save()
    nugget_comments = NuggetComment.objects.filter(forum_id=forum_id,
                                                   theme_id=theme_id).order_by(
      'created_at')
  for nugget_comment in nugget_comments:
    context['nugget_comments'].append(nugget_comment)
  response['workbench_nugget_comments'] = render_to_string(
    "workbench_nugget_comments.html", context)
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
    item["description"] = theme.description
    response["themes"].append(item)
  context["phase"] = PHASE_CONTROL[forum.phase]
  return HttpResponse(json.dumps(response), mimetype='application/json')


def get_author_list(request):
  response = {}
  context = {}
  forum = Forum.objects.get(id=request.session['forum_id'])
  context['forum_name'] = forum.full_name
  context['forum_url'] = forum.url
  roles = Role.objects.filter(forum=forum, role="panelist")
  response["authors"] = []
  for role in roles:
    item = {}
    item["name"] = role.user.first_name + " " + role.user.last_name
    item["id"] = role.user.id
    response["authors"].append(item)
  context["phase"] = PHASE_CONTROL[forum.phase]
  return HttpResponse(json.dumps(response), mimetype='application/json')


def api_load_highlights(request):
  response = {}
  response['highlights'] = []
  theme_id = request.REQUEST.get('theme_id')
  doc_id = request.REQUEST.get('doc_id')
  doc = Doc.objects.get(id=doc_id)
  if theme_id == "-1":
    for section in doc.sections.all():
      highlights = section.highlights.all()
      for highlight in highlights:
        highlight_info = highlight.getAttr()
        response['highlights'].append(highlight_info)
  else:
    for section in doc.sections.all():
      highlights = section.highlights.all()
      for highlight in highlights:
        if (highlight.theme != None and int(highlight.theme.id) == int(
            theme_id)):
          highlight_info = highlight.getAttr()
          response['highlights'].append(highlight_info)
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
  slot = Claim.objects.get(id=request.REQUEST.get('slot_id'))
  nugget = Claim.objects.get(id=request.REQUEST.get('nugget_id'))
  now = timezone.now()
  newClaim = Claim(forum_id=request.session['forum_id'], author=request.user,
                   created_at=now, updated_at=now,
                   content=content, claim_category=slot.claim_category)
  newClaim.save()
  claim_version = ClaimVersion(forum_id=request.session['forum_id'],
                               author=request.user, content=content,
                               created_at=now, updated_at=now, claim=newClaim,
                               is_adopted=True)
  claim_version.save()
  ClaimReference.objects.create(refer_type='claim', from_claim=newClaim,
                                to_claim=slot)
  ClaimReference.objects.create(refer_type='nug2claim', from_claim=nugget,
                                to_claim=newClaim)
  SlotAssignment.objects.create(forum_id=request.session['forum_id'],
                                user=request.user,
                                entry=newClaim, created_at=now,
                                slot=slot, event_type='add')
  response["claim_id"] = newClaim.id
  return HttpResponse(json.dumps(response), mimetype='application/json')


def add_nugget_to_claim(request):
  """
  Used when a nugget is added to a claim to merge into it.
  :param request:
  :return:
  """
  response = {}

  content = request.REQUEST.get('content')
  forum = Forum.objects.get(id=request.session['forum_id'])
  src_nugget = Claim.objects.get(id=request.REQUEST.get('nugget_id'))
  target_claim = Claim.objects.get(id=request.REQUEST.get('claim_id'))
  # TODO: preserve edit history
  target_claim.content = content
  target_claim.save()
  version = target_claim.adopted_version()
  version.content = content
  version.save()
  now = timezone.now()
  ClaimReference.objects.create(refer_type='nug2claim', from_claim=src_nugget,
                                to_claim=target_claim)
  ClaimNuggetAssignment.objects.create(forum=forum,
                                       user=request.user,
                                       entry=target_claim,
                                       created_at=now,
                                       claim=target_claim,
                                       nugget=src_nugget,
                                       event_type='add')
  return HttpResponse(json.dumps(response), mimetype='application/json')


def suggest_claim(request):
  response = {}
  claim = Claim.objects.get(id=request.REQUEST.get('claim_id'))
  content = request.REQUEST.get('content')
  now = timezone.now()
  new_version = ClaimVersion(forum_id=request.session['forum_id'],
                             content=content, created_at=now, updated_at=now,
                             is_adopted=False, claim=claim)
  if 'actual_user_id' in request.session:
    new_version.author = actual_author
    new_version.delegator = request.user
  else:
    new_version.author = request.user
  new_version.save()
  if (ClaimVersion.objects.filter(claim=claim).count() == 2):
    ClaimVersion.objects.filter(claim=claim).update(is_adopted=False)
    new_version.is_adopted = True
    new_version.save()
  return HttpResponse(json.dumps(response), mimetype='application/json')


def api_assign_nugget(request):
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
  response['workbench_nuggets'] = render_to_string("workbench-nuggets.html",
                                                   context)
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
  response['workbench_single_nugget'] = render_to_string(
    "workbench-single-nugget.html", context)
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
  response['workbench_single_nugget'] = render_to_string(
    "workbench-single-nugget.html", context)
  return HttpResponse(json.dumps(response), mimetype='application/json')


def get_nugget_list(request):
  """
  Get list of nuggets (claims), in categories.
  :param request:
  :return:
  """
  forum = Forum.objects.get(id=request.session['forum_id'])
  response = {}
  context = {}
  category_list = ['finding', 'pro', 'con']
  nugget_claim_usage = {}
  context['categories'] = {'finding': [], 'pro': [], 'con': []}
  slots = Claim.objects.filter(forum=forum, is_deleted=False,
                               stmt_order__isnull=False)
  for category in category_list:
    for slot in slots.filter(claim_category=category).order_by('stmt_order'):
      slot_info = slot.getAttrSlot(forum)
      for nugget_info in slot_info['nuggets']:
        target_claims = ClaimReference.objects.filter(refer_type='nug2claim',
                                                 from_claim_id=
                                                 nugget_info['id'])
        nugget_info['used_in_claims'] = []
        nugget_claim_usage[nugget_info['id']] = []
        for ref in target_claims:
          nugget_info['used_in_claims'].append(ref.to_claim.id)
          nugget_claim_usage[nugget_info['id']].append(ref.to_claim.id)
      context['categories'][category].append(slot_info)

  response['nugget_claim_usage'] = nugget_claim_usage
  response['html'] = render_to_string('phase2/nuggets.html', context)
  return HttpResponse(json.dumps(response), mimetype='application/json')


def api_edit_claim(request):
  claim_id = request.REQUEST.get("claim_id")
  content = request.REQUEST.get("content")
  claim = Claim.objects.get(id=claim_id)
  claim.content = content
  claim.save()
  response = {}
  return HttpResponse(json.dumps(response), mimetype='application/json')


def get_claim_activity(request):
  response = {}
  action = request.REQUEST.get('action')
  if action == 'load-thread':
    print "slot_id", request.REQUEST.get('slot_id')
    claim = Claim.objects.get(id=request.REQUEST.get('slot_id'))
    forum = Forum.objects.get(id=request.session['forum_id'])
    context = {}
    context['entries'] = []
    posts = claim.comments_of_entry.all()
    for post in posts:
      for comment in post.getTree(exclude_root=False):
        context['entries'].append(comment.getAttr(forum))
    # performed rewording
    for version in claim.versions.all():
      version_info = version.getAttr(forum)
      version_info["author_intro"] = version.getAuthor()["author_intro"]
      context['entries'].append(version_info)
      posts = version.comments_of_entry.all()
      for post in posts:
        for comment in post.getTree(exclude_root=False):
          context['entries'].append(comment.getAttr(forum))
    for claimNuggetAssignment in ClaimNuggetAssignment.objects.filter(
        claim=claim):
      nugget_assignment_info = claimNuggetAssignment.getAttr(forum)
      nugget_id = nugget_assignment_info["nugget_id"]
      nugget_assignment_info["nugget_content"] = Highlight.objects.get(
        id=nugget_id).text
      context['entries'].append(nugget_assignment_info)
    for root_comment in ClaimComment.objects.filter(claim=claim,
                                                    parent__isnull=True):
      entry = {}
      entry["root_comment"] = root_comment
      entry["id"] = root_comment.id
      entry["is_answered"] = root_comment.is_answered
      entry["created_at_full"] = root_comment.created_at
      entry['comments'] = root_comment.get_descendants(include_self=True)
      entry["entry_type"] = "claim_" + str(root_comment.comment_type)
      entry[
        "author_name"] = root_comment.author.first_name + " " + root_comment.author.last_name
      entry["author_role"] = Role.objects.get(user=root_comment.author,
                                              forum=forum).role
      entry["author_intro"] = UserInfo.objects.get(
        user=claim.author).description
      entry["author_id"] = root_comment.author.id
      entry["created_at_pretty"] = utils.pretty_date(
        root_comment.created_at)
      context['entries'].append(entry)
    # slot assignment events
    # slotassignments = SlotAssignment.objects.filter(slot=slot)
    # for slotassignment in slotassignments:
    #     context['entries'].append(slotassignment.getAttr(forum))
    context['entries'] = sorted(context['entries'],
                                key=lambda en: en['created_at_full'],
                                reverse=True)
    context['nuggets'] = []
    highlightClaims = HighlightClaim.objects.filter(claim_id=claim.id)
    for highlightClaim in highlightClaims:
      context['nuggets'].append(highlightClaim.highlight.getAttr())
    context['claim'] = claim
    response['html'] = render_to_string('phase2/claim_detail.html', context)
    return HttpResponse(json.dumps(response), mimetype='application/json')
  return HttpResponse(json.dumps(response), mimetype='application/json')


def adopt_claim(request):
  response = {}
  version = ClaimVersion.objects.get(id=request.REQUEST.get('version_id'))
  ClaimVersion.objects.filter(claim_id=version.claim.id).update(
    is_adopted=False)
  version.is_adopted = True
  version.save()
  return HttpResponse(json.dumps(response), mimetype='application/json')


def remove_nugget_from_claim(request):
  response = {}
  context = {}
  highlight_id = request.REQUEST.get('highlight_id')
  claim_id = request.REQUEST.get('claim_id')
  forum = Forum.objects.get(id=request.session['forum_id'])
  HighlightClaim.objects.filter(claim_id=claim_id,
                                highlight_id=highlight_id).delete()
  ClaimAndTheme.objects.filter(claim_id=claim_id).delete()
  for highlightClaim in HighlightClaim.objects.filter(claim_id=claim_id):
    newClaimAndTheme = ClaimAndTheme(claim_id=claim_id,
                                     theme=highlightClaim.highlight.theme)
    newClaimAndTheme.save()
  now = timezone.now()
  if 'actual_user_id' in request.session:
    newClaimNuggetAssignment = ClaimNuggetAssignment(forum=forum,
                                                     user=actual_author,
                                                     delegator=request.user,
                                                     entry_id=claim_id,
                                                     created_at=now,
                                                     nugget_id=highlight_id,
                                                     claim_id=claim_id,
                                                     event_type='remove')
  else:
    newClaimNuggetAssignment = ClaimNuggetAssignment(forum=forum,
                                                     user=request.user,
                                                     entry_id=claim_id,
                                                     created_at=now,
                                                     claim_id=claim_id,
                                                     nugget_id=highlight_id,
                                                     event_type='remove')
  newClaimNuggetAssignment.save()
  context['nuggets'] = []
  highlightClaims = HighlightClaim.objects.filter(claim_id=claim_id)
  for highlightClaim in highlightClaims:
    context['nuggets'].append(highlightClaim.highlight.getAttr())
  response['html'] = render_to_string('phase2/candidate_nugget_list.html',
                                      context)
  return HttpResponse(json.dumps(response), mimetype='application/json')


def get_claim_comment_list(request):
  """
  Get thread of comments, given a claim.
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
  response['claim_comment_list'] = render_to_string(
    "phase2/claim_comment_list.html", context)
  response['claim_comment_highlight'] = render_to_string(
    "phase2/claim_comment_highlight.html", context)
  return HttpResponse(json.dumps(response), mimetype='application/json')


def add_comment_to_claim(request):
  # log in to comment
  if not request.user.is_authenticated():
    return HttpResponse("Please log in first.", status=403)
  # initialize
  response = {}
  author = request.user
  forum = Forum.objects.get(id=request.session['forum_id'])
  parent_id = request.REQUEST.get('parent_id')
  claim_id = request.REQUEST.get('claim_id')
  comment_type = request.REQUEST.get('comment_type')
  text = request.REQUEST.get('text')
  created_at = timezone.now()
  newClaimComment = ClaimComment(author=author, text=text, claim_id=claim_id,
                                 created_at=created_at,
                                 comment_type=comment_type, forum=forum)
  if parent_id != "":  # not root node
    newClaimComment.parent_id = parent_id
  newClaimComment.save()
  return HttpResponse(json.dumps(response), mimetype='application/json')


def get_claim_list(request):
  """
  Get list of claims, by category.
  :param request:
  :return:
  """
  forum = Forum.objects.get(id=request.session['forum_id'])
  response = {}
  context = {}

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

  response['workbench_claims'] = render_to_string('phase2/statement.html', context)
  return HttpResponse(json.dumps(response), mimetype='application/json')


def put_claim_comment(request):
  """
  Save a ClaimComment entry, after user posts a comment on a nugget (claim).
  :param request:
  :return:
  """
  forum = Forum.objects.get(id=request.session['forum_id'])
  response = {}
  author = request.user
  # Parent comment.
  parent_id = request.REQUEST.get('parent_id')
  # Context claim/nugget.
  claim_id = request.REQUEST.get('claim_id')
  text = request.REQUEST.get('text')
  created_at = timezone.now()
  context_claim = Claim.objects.get(id=claim_id)
  if parent_id == "":  # root node
    newClaimComment = ClaimComment(author=author, text=text,
                                   created_at=created_at,
                                   comment_type='comment', forum=forum,
                                   claim=context_claim)
  else:
    parent = ClaimComment.objects.get(id=parent_id)
    newClaimComment = ClaimComment(author=author, text=text,
                                   created_at=created_at,
                                   comment_type='comment', forum=forum,
                                   claim=context_claim, parent=parent)
  newClaimComment.save()
  return HttpResponse(json.dumps(response), mimetype='application/json')

