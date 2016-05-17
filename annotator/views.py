import json
import re
from HTMLParser import HTMLParser, HTMLParseError
from django.utils import timezone

from django.shortcuts import render, render_to_response
from django.http import HttpResponse
from django.template.loader import render_to_string
from django.core.cache import cache

from models import *

index_building = False


def update_index(request):
    global index_building
    if index_building:
        return
    index_building = True
    print "Building frequency index ..."
    anno = Annotation.objects.all()
    tmpCache = {}

    segmented_docs = {} # cache segmented docs

    def getTokens(content):
        s = Segmenter()
        try:
            s.feed(content)
            return s.get_tokens()
        except HTMLParseError:
            pass

    for an in anno:
        doc = an.source
        if not hasattr(doc, 'id'):
            continue
        if doc.id not in segmented_docs: # identical behavior with get_doc
            segmented_docs[doc.id] = getTokens('<p>' + '</p><p>'.join(doc.get_sentences_annotated()) + '</p>')
        text = ''.join(segmented_docs[doc.id][an.start:an.end + 1])
        text = text.lower().strip().replace(' ', '_')
        if len(text) == 0:
            continue
        if an.place_id: # from nominatim
            place_id = an.place_id
            place_type = 'nominatim'
        elif an.custom_place:
            place_id = an.custom_place.id
            place_type = 'custom'
        else:
            continue
        shape = an.shape
        if text in tmpCache:
            cached = tmpCache[text]
            if shape in cached: # cannot use ID as key
                cached[shape]['freq'] += 1
            else:
                cached[shape] = {
                    'freq': 1,
                    'type': place_type,
                    'place_id': place_id,
                    'text': an.text
                }
        else:
            tmpCache[text] = {
                shape: {
                    'freq': 1,
                    'type': place_type,
                    'place_id': place_id,
                    'text': an.text
                }
            }
    customPlaces = CustomPlace.objects.all()
    for cp in customPlaces:
        text = cp.place_name.lower().strip().replace(' ', '_')
        if len(text) == 0:
            continue
        shape = cp.shape
        if text in tmpCache:
            cached = tmpCache[text]
            if shape in cached: # cannot use ID as key
                cached[shape]['freq'] += 1
            else:
                cached[shape] = {
                    'freq': 1,
                    'type': 'custom',
                    'place_id': cp.id,
                    'text': cp.place_name
                }
        else:
            tmpCache[text] = {
                shape: {
                    'freq': 1,
                    'type': 'custom',
                    'place_id': cp.id,
                    'text': cp.place_name
                }
            }
    cache.clear()
    for key in tmpCache:
        cache.set(key, tmpCache[key])
    print "Frequency index built."
    index_building = False
    return HttpResponse()


def home(request):
    context = {}
    context['articles'] = []
    for art in Article.objects.filter(id__gte=569).exclude(article_type__contains='hidden').order_by('id'):
        if art.created_at:
            date = art.created_at.strftime('%m/%d/%Y')
        else:
            date = 'Unknown date'
        anno_count = Annotation.objects.filter(source=art).count()
        context['articles'].append({
            'id': art.id,
            'subject': art.subject,
            'date': date,
            'anno_count': anno_count,
            'type': art.article_type
        })
    return render(request, 'index.html', context)

def get_doc(request):
    i = request.REQUEST.get('id')
    art = Article.objects.get(id=i)
    content = '<p>' + '</p><p>'.join(art.get_sentences_annotated()) + '</p>'
    content = segment_text(content)
    if art.created_at:
        date = art.created_at.strftime('%m/%d/%Y')
        fulltime = art.created_at.strftime('%m/%d/%Y %H:%M')
    else:
        date = 'Unknown date'
        fulltime = 'Unknown date'
    response = {
        'title': art.subject,
        'content': content,
        'id': art.id,
        'date': date,
        'fulltime': fulltime,
        'url': art.article_url
    }
    return HttpResponse(json.dumps(response), mimetype='application/json')

def new_annotation(request):
    text = request.REQUEST.get('text')
    geotext = request.REQUEST.get('geotext') # only when user-drawn
    place_name = request.REQUEST.get('place_name')  # only when user-drawn
    now = timezone.now()

    response = {}
    # creating a new custom place
    if geotext and place_name and len(geotext) > 0 and len(place_name) > 0:
        newPlace = CustomPlace(shape=geotext, place_name=place_name, created_at=now)
        newPlace.save()
        Annotation.objects.create(text=text, custom_place=newPlace, shape=geotext, created_at=now)
        response['custom_place_id'] = newPlace.id
    return HttpResponse(json.dumps(response), mimetype='application/json')

def load_annotation(request):
    context_id = request.REQUEST.get('context_id')
    annotations = Annotation.objects.filter(source_id=context_id)
    response = {'highlights': []}
    for annotation in annotations:
        annotation_info = {
            'id': annotation.id,
            'text': annotation.text,
            'start': annotation.start,
            'end': annotation.end,
            'shape': annotation.shape
        }
        if annotation.custom_place:
            annotation_info['custom_place_id'] = annotation.custom_place_id
        else:
            annotation_info['place_id'] = annotation.place_id
        response['highlights'].append(annotation_info)
    return HttpResponse(json.dumps(response), mimetype='application/json')

def search_annotation(request):
    searchText = request.REQUEST.get('text').lower().replace(' ', '_')
    cached = cache.get(searchText)
    res = []
    if cached:
        res = sorted([{
            'place_id': cached[shape]['place_id'],
            'freq': cached[shape]['freq'],
            'type': cached[shape]['type'],
            'shape': shape,
            'text': cached[shape]['text']
        } for shape in cached], key=lambda f:f['freq'], reverse=True)
    html = render_to_string('geocoding_results.html', {
        'matched': res
    })
    return HttpResponse(json.dumps({
        'html': html,
        'matches': res
    }), mimetype='application/json')

def load_activities(request):
    annotations = Annotation.objects.all()
    activities = []
    activities += [item.toActivity() for item in annotations]
    activities = sorted(activities, key=lambda x:x['time'], reverse=True)
    return HttpResponse(json.dumps({
        'html': render_to_string("activities.html", {'activities': activities})
    }), mimetype='application/json')

def delete_annotation(request):
    id = request.REQUEST.get('id')
    Annotation.objects.get(id=id).delete()
    return HttpResponse(json.dumps({}), mimetype='application/json')

def change_code(request):
    id = request.REQUEST.get('id')
    code_type = request.REQUEST.get('code_type')
    code = request.REQUEST.get('code')
    annotation = Annotation.objects.get(id=id)
    if code_type == 'resolve':
        if annotation.res_code:
            annotation.res_code = code + annotation.res_code
        else:
            annotation.res_code = code
        annotation.save()
    elif code_type == 'reference':
        annotation.ref_code = code
        annotation.save()
    return HttpResponse(json.dumps({}), mimetype='application/json')

def segment_text(content):
    s = Segmenter()
    try:
        s.feed(content)
        return s.get_data()
    except HTMLParseError:
        pass

class Segmenter(HTMLParser):
    def __init__(self):
        self.reset()
        self.fed = [] # final content, including tokens and tags
        self.tokens = [] # tokens only. tokens[i] must have token_id == i
        self.token_id = 0

    def handle_data(self, d):
        tokens = re.findall(r"[\w'-]+|[.,\\/!?;:\" ]", d)
        for token in tokens:
            self.fed.append('<u class="tk" data-id="' + str(self.token_id) + '">' + token + '</u>')
            self.tokens.append(token)
            self.token_id += 1


    def handle_starttag(self, d, attr):
        if d == 'span':
            self.fed.append('<span class="geotag">')
        else:
            tag = ['<', d]
            for a in attr:
                tag.extend([' ', a[0], '="', a[1], '"'])
            tag.append('>')
            self.fed.append(''.join(tag))

    def handle_endtag(self, d):
        self.fed.append('</' + d + '>')

    def handle_startendtag(self, d, attr):
        tag = ['<', d]
        for a in attr:
            tag.extend([' ', a[0], '="', a[1], '"'])
        tag.append(' />')
        self.fed.append(''.join(tag))

    def get_data(self):
        return ''.join(self.fed)

    def get_tokens(self):
        return self.tokens