import json

from django.template.loader import render_to_string
from django.http import HttpResponse
from django.utils import timezone

from cir.models import *

from cir.phase_control import PHASE_CONTROL
import utils


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
  response['claims'] = render_to_string('phase4/claim.html', context)
  return HttpResponse(json.dumps(response), mimetype='application/json')


def get_statement_list(request):
  """
  Get list of statements (claims), in categories.
  :param request:
  :return:
  """
  forum = Forum.objects.get(id=request.session['forum_id'])
  response = {}
  context = {}
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

  response['html'] = render_to_string('phase4/statement.html', context)
  return HttpResponse(json.dumps(response), mimetype='application/json')


def put_statement(request):
  response = {}
  content = request.REQUEST.get('content')
  slot = Claim.objects.get(id=request.REQUEST.get('slot_id'))
  claim = Claim.objects.get(id=request.REQUEST.get('claim_id'))
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
  ClaimReference.objects.create(refer_type='stmt', from_claim=newClaim,
                                to_claim=slot)
  ClaimReference.objects.create(refer_type='claim2stmt', from_claim=claim,
                                to_claim=newClaim)
  SlotAssignment.objects.create(forum_id=request.session['forum_id'],
                                user=request.user,
                                entry=newClaim, created_at=now,
                                slot=slot, event_type='add')
  return HttpResponse(json.dumps(response), mimetype='application/json')


def add_claim_to_statement(request):
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
