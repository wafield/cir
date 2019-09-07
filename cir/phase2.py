import json
import re
import nltk
import math
from collections import defaultdict
from django.template.loader import render_to_string
from django.http import HttpResponse
from django.utils import timezone
from string import punctuation
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize
from nltk.stem import PorterStemmer
from nltk.corpus import wordnet as wn
import gensim
from cir.models import *
import pickle
from gensim import corpora

stop_words = stopwords.words('english') + list(punctuation)
ps = PorterStemmer()

def put_claim(request):
  """

  :param request:
  :return:
  """
  response = {}
  content = request.REQUEST.get('content')
  slot = Claim.objects.get(id=request.REQUEST.get('slot_id'))
  nugget_ids = request.POST.getlist('nugget_ids[]')
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
  for nugget_id in nugget_ids:
    ClaimReference.objects.create(refer_type='nug2claim',
                                  from_claim_id=nugget_id,
                                  to_claim=newClaim)
  SlotAssignment.objects.create(forum_id=request.session['forum_id'],
                                user=request.user,
                                entry=newClaim, created_at=now,
                                slot=slot, event_type='add')
  response["claim_id"] = newClaim.id
  return HttpResponse(json.dumps(response), mimetype='application/json')

def process_text(request):
  # Processing the input draft claim, interpret, and annotate.

  content = request.REQUEST.get('content')
  words = stem_words(remove_stop_words(tokenize(content)))
  pos = nltk.pos_tag(words)
  return HttpResponse(json.dumps({
    'words': words,
    'pos': pos
  }), mimetype='application/json')

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
  dictionary = gensim.corpora.Dictionary.load('dictionary.gensim')
  corpus = pickle.load(open('corpus.pkl', 'rb'))
  ldamodel = gensim.models.ldamodel.LdaModel.load('model6.gensim')


  forum = Forum.objects.get(id=request.session['forum_id'])
  response = {}
  context = {}
  category_list = ['finding', 'pro', 'con']
  nuggets_metadata = {}
  context['categories'] = {'finding': [], 'pro': [], 'con': []}
  vocabulary = set()
  all_nuggets = []
  word_idf = defaultdict(lambda: 0)
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
        for ref in target_claims:
          nugget_info['used_in_claims'].append(ref.to_claim.id)
        

        tokens = tokenize(nugget_info['content'])
        tokens_stemed_non_stop = stem_words(remove_stop_words(tokens))

        syn = {}
        for i, token in enumerate(tokens):
          token_stem = wn.morphy(token)
          syn[i] = {
            'token': token,
            'token_stem': token_stem
          }
          if not token_stem or is_stop_word(token_stem):
            continue
          syn[i]['syn'] = synonyms(token)
          syn[i]['hyp'] = hypohyper(token)

        # Stemmed word-bag for each nugget.
        all_nuggets.append(tokens_stemed_non_stop)

        vocabulary.update(tokens_stemed_non_stop)
        for word in tokens_stemed_non_stop:
          word_idf[word] += 1
        highlight = HighlightClaim.objects.get(claim_id=nugget_info['id']).highlight
        src_doc = highlight.context.docsection

        # topics_prob = ldamodel.get_document_topics(dictionary.doc2bow(tokens_stemed_non_stop))


        nuggets_metadata[nugget_info['id']] = {
          'cat': category,
          'slot_question': slot.title,
          'slot_id': slot.id,
          'words': tokens_stemed_non_stop,
          'syn': syn,
          'used_in_claims': nugget_info['used_in_claims'],
          'author_id': nugget_info['author_id'],
          'docsrc_author': get_doc_author(src_doc.title),
          'docsrc_title': src_doc.title,
          'docsrc_id': src_doc.id,
          'docsrc_cat': src_doc.getCat(),
          'src_offset': highlight.start_pos,
          'reco_score': 0,
          'reco_reason': '',
        }
      context['categories'][category].append(slot_info)



  # Compute TF-IDF
  for word in vocabulary:
    word_idf[word] = math.log(len(nuggets_metadata) / float(1 + word_idf[word]))
  for nug_id in nuggets_metadata:
    nug_metadata = nuggets_metadata[nug_id]
    nug_metadata['tfidf'] = {}
    words = nug_metadata['words']
    for w in set(words):
      nug_metadata['tfidf'][w] = float(words.count(w)) / len(words) * word_idf[w]
   
  response['nuggets_metadata'] = nuggets_metadata
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
  claims_metadata = {}

  category_list = ['finding', 'pro', 'con']
  context['categories'] = {}
  slots = Claim.objects.filter(forum=forum, is_deleted=False,
                               stmt_order__isnull=False)
  for category in category_list:
    context['categories'][category] = []
    slots_cat = slots.filter(claim_category=category).order_by('stmt_order')
    for slot in slots_cat:
      slot_info = slot.getAttrSlot(forum)
      for claim in slot_info['claims']:
        tokens = stem_words(remove_stop_words(tokenize(claim['content'])))
        src_nuggets = []
        for ref in ClaimReference.objects.filter(refer_type='nug2claim', to_claim_id=claim['id']):
          src_nuggets.append(ref.from_claim.id)
        claims_metadata[claim['id']] = {
          'cat': category,
          'words': tokens,
          'src_nuggets': src_nuggets,
          'author_id': claim['author_id'],
          'reco_score': 0,
          'reco_reason': '',
          'slot_id': slot.id,
        }
      context['categories'][category].append(slot_info)

  response['claims_metadata'] = claims_metadata
  response['html'] = render_to_string('phase2/statement.html', context)
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


def remove_stop_words(words):
  results = []
  for w in words:
    if not is_stop_word(w):
      results.append(w.lower())    
  return results

def is_stop_word(w):
  if not w.isalpha():
    return True
  if w.lower() in stop_words:
    return True
  return False

def stem_words(words):
  # Using WordNet lemmatizer.
  return [wn.morphy(w) or w for w in words]

  # return [ps.stem(w) for w in words]  # Using Porter Stemmer


def tokenize(sent):
  return word_tokenize(sent)


def synonyms(token):
  syn = []
  for s in wn.synsets(token):
    for l in s.lemmas():
      if '_' not in l.name():
        syn.append(l.name())
  return list(set(syn))

def hypohyper(token):
  syn = []
  for s in wn.synsets(token):
    for hyp in s.hyponyms():
      for l in hyp.lemmas():
        if '_' not in l.name():
          syn.append(l.name())
    for hyp in s.hypernyms():
      for l in hyp.lemmas():
        if '_' not in l.name():
          syn.append(l.name())

  return list(set(syn))


def get_doc_author(title):
  authors = [
    'Scot Chambers',
    'Dwight Miller',
    'Susan Venegoni',
    'Ron Madrid'
  ]
  for author in authors:
    if author in title:
      return author
  return 'Unknown'