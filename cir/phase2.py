import json

from django.template.loader import render_to_string
from django.http import HttpResponse
from django.utils import timezone

from cir.models import *

def put_claim(request):
  """

  :param request:
  :return:
  """
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

