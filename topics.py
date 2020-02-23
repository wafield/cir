#!/usr/bin/env python

# Following: https://towardsdatascience.com/evaluate-topic-model-in-python-latent-dirichlet-allocation-lda-7d57484bb5d0


import os
import sys
import pandas as pd
import gensim
import spacy
from gensim.utils import simple_preprocess
from nltk.corpus import stopwords

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "cir.settings")

from cir.models import *
from cir.phase2 import *
   
stop_words = stopwords.words('english')

forum = Forum.objects.get()
slots = Claim.objects.filter(forum=forum, is_deleted=False,
                              stmt_order__isnull=False)
category_list = ['finding', 'pro', 'con']

vocabulary = set()

# Words from all nuggets. List of list.
data_words = []

for category in category_list:
    for slot in slots.filter(claim_category=category).order_by('stmt_order'):
      slot_info = slot.getAttrSlot(forum)
      for nugget_info in slot_info['nuggets']:
        target_claims = ClaimReference.objects.filter(refer_type='nug2claim',
                                                 from_claim_id=
                                                 nugget_info['id'])

        tokens = tokenize(nugget_info['content'].lower())
        # tokens_stemed_non_stop = stem_words(remove_stop_words(tokens))

        data_words.append(tokens)

print data_words

bigram = gensim.models.Phrases(data_words, min_count=5, threshold=100) # higher threshold fewer phrases.
trigram = gensim.models.Phrases(bigram[data_words], threshold=100)
bigram_mod = gensim.models.phrases.Phraser(bigram)
trigram_mod = gensim.models.phrases.Phraser(trigram)

def remove_stopwords(texts):
    return [[word for word in simple_preprocess(str(doc)) if word not in stop_words] for doc in texts]

def make_bigrams(texts):
    return [bigram_mod[doc] for doc in texts]
def make_trigrams(texts):
    return [trigram_mod[bigram_mod[doc]] for doc in texts]
def lemmatization(texts, allowed_postags=['NOUN', 'ADJ', 'VERB', 'ADV']):
    texts_out = []
    for sent in texts:
        doc = nlp(" ".join(sent)) 
        texts_out.append([token.lemma_ for token in doc if token.pos_ in allowed_postags])
    return texts_out


data_words_nostops = remove_stopwords(data_words)
data_words_bigrams = make_bigrams(data_words_nostops)
nlp = spacy.load("en_core_web_sm", disable=['parser', 'ner'])
data_lemmatized = lemmatization(data_words_bigrams, allowed_postags=['NOUN', 'ADJ', 'VERB', 'ADV'])

# print(data_lemmatized[:1])



