import json
import re
import math
import numpy as np
from django.http import HttpResponse
from django.template.loader import render_to_string
from django.utils import timezone
from cir.models import *
from datetime import datetime, date, timedelta
import time
import pytz
import utils

from . import preprocessing

# how many words serve as the minimum unit
num_word_for_each_unit = 50

def get_graph(request):
	relation = request.REQUEST.get('relation')
	# filters
	author_ids = request.REQUEST.get('author_ids').split(" ")
	theme_ids = request.REQUEST.get('theme_ids').split(" ")
	doc_ids = request.REQUEST.get('doc_ids').split(" ")
	time_upper_bound = request.REQUEST.get('time_upper_bound')
	time_upper_bound = datetime.strptime(time_upper_bound, "%Y %m %d %H %M")
	time_lower_bound = request.REQUEST.get('time_lower_bound')
	time_lower_bound = datetime.strptime(time_lower_bound, "%Y %m %d %H %M")
	# initialize
	forum_id = request.session['forum_id']
	forum = Forum.objects.get(id = forum_id)
	highlights = Highlight.objects.all()
	highlights = highlights.filter(created_at__lte = time_upper_bound, created_at__gte = time_lower_bound, is_nugget = True)
	if (author_ids[0] != ""):
		highlights = highlights.filter(author_id__in = author_ids)
	if (theme_ids[0] != ""):
		highlights = highlights.filter(theme_id__in = theme_ids)
	if (doc_ids[0] != ""):
		sec_ids = ""
		for sec in DocSection.objects.filter(doc_id__in = doc_ids):
			sec_ids = sec_ids + " " + str(sec.id)
		highlights = highlights.filter(context_id__in = sec_ids.strip().split(" "))

	print "-------------------", highlights.count()
	graph = {}
	graph["nodes"] = []
	graph["links"] = []

	if (relation == "dst"):
		pair_set = []
		for h in highlights:
			if (h.context != None and h.theme != None and DocSection.objects.get(id=h.context.id).forum_id == forum_id):
				section_id = h.context.id
				section_title = DocSection.objects.get(id = section_id).title
				theme_id = h.theme.id
				theme_name = h.theme.name
				# create have-been-used nodes
				section_node = {"name": "section-" + str(section_id), "text": section_title}
				if section_node not in graph["nodes"]:
					graph["nodes"].append(section_node)
				theme_node = {"name": "theme-" + str(theme_id), "text": theme_name}
				if theme_node not in graph["nodes"]:
					graph["nodes"].append(theme_node)
				# if no links yet, create one; otherwise, accumulate
				key = str(section_id) + " " + str(theme_id)
				if key not in pair_set:
					pair_set.append(key)
					graph["links"].append({"source": "section-" + str(section_id), "target": "theme-" + str(theme_id), "value":1})
				else:
					for item in graph["links"]:
						if (item["source"] == "section-" + str(section_id) and item["target"] == "theme-" + str(theme_id)):
							item["value"] = item["value"] + 1
							break
		# create dummy themes for alone sections
		isEmptySection = False
		sections = DocSection.objects.filter(forum_id=request.session['forum_id'])
		for section in sections:
			section_node = {"name": "section-" + str(section.id), "text": section.title}
			graph["links"].append({"source": "doc-" + str(section.doc.id), "target": "section-" + str(section.id), "value":1})
			if section_node not in graph["nodes"]:
				isEmptySection = True
				graph["nodes"].append(section_node)
				graph["links"].append({"source": "section-" + str(section.id), "target": "theme-dummy", "value":1})
		if isEmptySection:
			graph["nodes"].append({"name": "theme-dummy", "text": "theme-dummy"})
		# create dummy sections for not-alone themes
		isEmptyTheme = False
		themes = ClaimTheme.objects.filter(forum_id=request.session['forum_id'])
		for theme in themes:
			theme_node = {"name": "theme-" + str(theme.id), "text": theme.name}
			if theme_node not in graph["nodes"]:
				isEmptyTheme = True
				graph["nodes"].append(theme_node)
				graph["links"].append({"source": "section-dummy", "target": "theme-" + str(theme.id), "value":1})
		if isEmptyTheme:
			graph["nodes"].append({"name": "section-dummy", "text": "section-dummy"})
		docs = Doc.objects.filter(forum_id=request.session['forum_id'])
		for doc in docs:
			graph["nodes"].append({"name": "doc-" + str(doc.id), "text":  str(doc.title)})
	elif (relation == "dt"):
		pair_set = []
		for h in highlights:
			if (h.context != None and h.theme != None and DocSection.objects.get(id=h.context.id).forum_id == forum_id):
				doc_id = DocSection.objects.get(id=h.context.id).doc.id
				doc_title = DocSection.objects.get(id=h.context.id).doc.title
				theme_id = h.theme.id
				theme_name = h.theme.name
				# create have-been-used nodes
				doc_node = {"name": "doc-" + str(doc_id), "text": doc_title}
				if doc_node not in graph["nodes"]:
					graph["nodes"].append(doc_node)
				theme_node = {"name": "theme-" + str(theme_id), "text": theme_name}
				if theme_node not in graph["nodes"]:
					graph["nodes"].append(theme_node)
				# if no links yet, create one; otherwise, accumulate
				key = str(doc_id) + " " + str(theme_id)
				if key not in pair_set:
					pair_set.append(key)
					graph["links"].append({"source": "doc-" + str(doc_id), "target": "theme-" + str(theme_id), "value":1})
				else:
					for item in graph["links"]:
						if (item["source"] == "doc-" + str(doc_id) and item["target"] == "theme-" + str(theme_id)):
							item["value"] = item["value"] + 1
							break
	elif (relation == "dpt"):
		doc_author_pair_set = []
		author_theme_pair_set = []
		for h in highlights:
			if (h.context != None and h.theme != None and DocSection.objects.get(id=h.context.id).forum_id == forum_id):
				doc_id = DocSection.objects.get(id=h.context.id).doc.id
				doc_title = DocSection.objects.get(id=h.context.id).doc.title
				theme_id = h.theme.id
				theme_name = h.theme.name
				author_id = h.author.id
				author_name = h.author.first_name + " " + h.author.last_name
				# create have-been-used nodes
				doc_node = {"name": "doc-" + str(doc_id), "text": doc_title}
				if doc_node not in graph["nodes"]:
					graph["nodes"].append(doc_node)
				author_node = {"name": "author-" + str(author_id), "text": author_name}
				if author_node not in graph["nodes"]:
					graph["nodes"].append(author_node)
				theme_node = {"name": "theme-" + str(theme_id), "text": theme_name}
				if theme_node not in graph["nodes"]:
					graph["nodes"].append(theme_node)
				# if no links yet, create one; otherwise, accumulate
				key = str(doc_id) + " " + str(author_id)
				if key not in doc_author_pair_set:
					doc_author_pair_set.append(key)
					graph["links"].append({"source": "doc-" + str(doc_id), "target": "author-" + str(author_id), "value":1})
				else:
					for item in graph["links"]:
						if (item["source"] == "doc-" + str(doc_id) and item["target"] == "author-" + str(author_id)):
							item["value"] = item["value"] + 1
							break
				key = str(author_id) + " " + str(theme_id)
				if key not in author_theme_pair_set:
					author_theme_pair_set.append(key)
					graph["links"].append({"source": "author-" + str(author_id), "target": "theme-" + str(theme_id), "value":1})
				else:
					for item in graph["links"]:
						if (item["source"] == "author-" + str(author_id) and item["target"] == "theme-" + str(theme_id)):
							item["value"] = item["value"] + 1
							break
	elif (relation == "dp"):
		doc_author_pair_set = []
		for h in highlights:
			if (h.context != None and DocSection.objects.get(id=h.context.id).forum_id == forum_id):
				doc_id = DocSection.objects.get(id=h.context.id).doc.id
				doc_title = DocSection.objects.get(id=h.context.id).doc.title
				author_id = h.author.id
				author_name = h.author.last_name
				# create have-been-used nodes
				doc_node = {"name": "doc-" + str(doc_id), "text": doc_title}
				if doc_node not in graph["nodes"]:
					graph["nodes"].append(doc_node)
				author_node = {"name": "author-" + str(author_id), "text": author_name}
				if author_node not in graph["nodes"]:
					graph["nodes"].append(author_node)
				# if no links yet, create one; otherwise, accumulate
				key = str(doc_id) + " " + str(author_id)
				if key not in doc_author_pair_set:
					doc_author_pair_set.append(key)
					graph["links"].append({"source": "doc-" + str(doc_id), "target": "author-" + str(author_id), "value":1})
				else:
					for item in graph["links"]:
						if (item["source"] == "doc-" + str(doc_id) and item["target"] == "author-" + str(author_id)):
							item["value"] = item["value"] + 1
							break
	# graph["doc_length_map"] = doc_length_map
	return HttpResponse(json.dumps(graph), content_type='application/json')

def get_doc(request):
	response = {}
	return HttpResponse(json.dumps(response), content_type='application/json')

# enhanced scroll bar
def get_viewlog(request):
	# filters
	my_id = request.REQUEST.get('my_id')
	doc_id = request.REQUEST.get('doc_id')
	viewlogs = ViewLog.objects.filter(author_id = my_id, doc_id = doc_id)
	if (viewlogs.count() == 0):
		forum = Forum.objects.get(id = request.session['forum_id'])
		length = 0
		for section in Doc.objects.get(id = doc_id).sections.all():
			section_segmented_text = section.getAttr(forum)["segmented_text"]
			length = length + len(re.findall(r"data-id", section_segmented_text))
		length = length / num_word_for_each_unit  # length was the numebr of chars
		heatmap = [0] * length
		heatmap = ",".join(str(x) for x in heatmap)
		ViewLog.objects.create(doc_id = doc_id, author_id = my_id, created_at = timezone.now(), heatmap = heatmap)
	viewlog = viewlogs.order_by("-created_at")[0]
	arr = viewlog.heatmap.split(",")
	arr = [int(x) for x in arr]
	l = np.array(arr)
	response = {}
	response["my_viewlog"] = l.tolist()
	return HttpResponse(json.dumps(response), content_type='application/json')

def put_nuggetmap(request):
	upper_bound = request.REQUEST.get('upper_bound')
	lower_bound = request.REQUEST.get('lower_bound')
	doc_id = request.REQUEST.get('doc_id')
	author_id = request.REQUEST.get('author_id')
	theme_id = request.REQUEST.get('theme_id')
	response = {}
	context = {}
	forum_id = request.session['forum_id']
	forum = Forum.objects.get(id = forum_id)
	nuggetmaps = NuggetMap.objects.filter(doc_id = doc_id, author_id = author_id, theme_id = theme_id)
	if (nuggetmaps.count() > 1):
		nuggetmap_latest = nuggetmaps.order_by("-created_at")[0]
		distribution = nuggetmap_latest.distribution.split(",")
		distribution = [int(x) for x in distribution]
		length = len(distribution)
	else:
		length = get_doc_length(forum, doc_id)
		length = length / num_word_for_each_unit
		distribution = [0] * length
	left = int(round(length * (float)(upper_bound)))
	right = int(round(length * (float)(lower_bound)))
	if (left == right):
		if (right == length): left = left - 1
		elif (left == 0): right = right + 1
		else: left = left - 1
	for i in range(left, right): # include start and exclude end
		distribution[i] = 1
	distribution = ",".join(str(x) for x in distribution)
	NuggetMap.objects.create(doc_id = doc_id, author_id = author_id, theme_id = theme_id, created_at = timezone.now(), distribution = distribution)
	return HttpResponse(json.dumps(response), content_type='application/json')

def get_nuggetmap(request):
	# filters
	my_id = request.REQUEST.get('my_id')
	doc_id = request.REQUEST.get('doc_id')
	theme_id = request.REQUEST.get('theme_id')
	if theme_id == "-1":
		nuggetmaps = NuggetMap.objects.filter(author_id = my_id, doc_id = doc_id)
	else:
		nuggetmaps = NuggetMap.objects.filter(author_id = my_id, doc_id = doc_id, theme_id = theme_id)
	if (nuggetmaps.count() == 0):
		forum = Forum.objects.get(id = request.session['forum_id'])
		length = get_doc_length(forum, doc_id)
		length = length / num_word_for_each_unit
		distribution = [0] * length
		distribution = ",".join(str(x) for x in distribution)
		themes = ClaimTheme.objects.filter(forum = forum)
		for theme in themes:
			NuggetMap.objects.create(theme = theme, doc_id = doc_id, author_id = my_id, created_at = timezone.now(), distribution = distribution)
	nuggetmap = nuggetmaps.order_by("-created_at")[0]
	arr = nuggetmap.distribution.split(",")
	arr = [int(x) for x in arr]
	l = np.array(arr)
	response = {}
	response["my_nuggetmap"] = l.tolist()
	return HttpResponse(json.dumps(response), content_type='application/json')

def get_highlights(request):
	# filters
	selected = request.REQUEST.get("selected")
	doc_id = request.REQUEST.get('doc_id')
	author_ids = request.REQUEST.get('author_ids').split(" ")
	theme_ids = request.REQUEST.get('theme_ids').split(" ")
	time_upper_bound = request.REQUEST.get('time_upper_bound')
	time_upper_bound = datetime.strptime(time_upper_bound, "%Y %m %d %H %M")
	time_lower_bound = request.REQUEST.get('time_lower_bound')
	time_lower_bound = datetime.strptime(time_lower_bound, "%Y %m %d %H %M")
	response = {}
	response['highlights'] = []
	sections_queryset = Doc.objects.get(id = doc_id).sections
	highlights = Highlight.objects.all()
	highlights = highlights.filter(context_id__in = sections_queryset.values('id'))
	highlights = highlights.filter(author_id__in = author_ids, theme_id__in = theme_ids)
	highlights = highlights.filter(created_at__lte = time_upper_bound).filter(created_at__gte = time_lower_bound)
	for highlight in highlights:
		highlight_info = highlight.getAttr()
		response['highlights'].append(highlight_info)
	return HttpResponse(json.dumps(response), mimetype='application/json')

def get_highlights2(request):
	# filters
	forum = Forum.objects.get(id = request.session['forum_id'])
	theme_ids = ClaimTheme.objects.filter(forum = forum).values("id")
	highlights = Highlight.objects.filter(theme_id__in = theme_ids, is_nugget = True)
	response = {}
	response['highlights'] = []
	for highlight in highlights:
		highlight_info = {}
		highlight_info["id"] = highlight.id
		highlight_info["date"] = timezone.localtime(highlight.created_at).strftime("%Y %m %d %H %M")
		highlight_info["doc_id"] = DocSection.objects.get(id = highlight.context.id).doc.id
		highlight_info["theme_id"] = highlight.theme.id
		highlight_info["author_id"] = highlight.author.id
		highlight_info["author_name"] = str(highlight.author)
		highlight_info["theme_name"] = str(highlight.theme.name)
		response['highlights'].append(highlight_info)
	# we only consider root docs by this moment
	docs = Doc.objects.filter(forum=forum).order_by("order")
	nuggetmaps = NuggetMap.objects.filter(doc_id__in = docs.values('id'))
	viewlogs = ViewLog.objects.filter(doc_id__in = docs.values('id'))
	if (nuggetmaps.count() != 0 and viewlogs.count() != 0):
		time_upper_bound = max(nuggetmaps.order_by("-created_at")[0].created_at, viewlogs.order_by("-created_at")[0].created_at)
		time_lower_bound = min(nuggetmaps.order_by("created_at")[0].created_at, viewlogs.order_by("created_at")[0].created_at)
	elif nuggetmaps.count() != 0:
		time_upper_bound = nuggetmaps.order_by("-created_at")[0].created_at
		time_lower_bound = nuggetmaps.order_by("created_at")[0].created_at
	elif viewlogs.count() != 0:
		time_upper_bound = viewlogs.order_by("-created_at")[0].created_at
		time_lower_bound = viewlogs.order_by("created_at")[0].created_at
	else:
		time_upper_bound = datetime(2014, 8, 15, 8, 15, 12, 0, pytz.UTC)
		time_lower_bound = datetime(2018, 8, 15, 8, 15, 12, 0, pytz.UTC)
	time_upper_bound = timezone.localtime(time_upper_bound).strftime("%Y %m %d %H %M")
	time_lower_bound = timezone.localtime(time_lower_bound).strftime("%Y %m %d %H %M")
	response["time_upper_bound"] = time_upper_bound
	response["time_lower_bound"] = time_lower_bound
	return HttpResponse(json.dumps(response), mimetype='application/json')

def get_doc_coverage(request):
	# filters
	selected = request.REQUEST.get("selected")
	author_ids = request.REQUEST.get('author_ids').split(" ")
	theme_ids = request.REQUEST.get('theme_ids').split(" ")
	doc_ids = request.REQUEST.get('doc_ids').split(" ")
	time_upper_bound = request.REQUEST.get('time_upper_bound')
	time_upper_bound = datetime.strptime(time_upper_bound, "%Y %m %d %H %M")
	time_lower_bound = request.REQUEST.get('time_lower_bound')
	time_lower_bound = datetime.strptime(time_lower_bound, "%Y %m %d %H %M")
	# initialize
	response = {}
	context = {}
	forum = Forum.objects.get(id = request.session['forum_id'])
	docs = Doc.objects.filter(forum=forum)
	# add author arrow
	response["author_activity_map"] = {}
	for author_id in author_ids:
		viewlogs = ViewLog.objects.filter(
			created_at__lte = time_upper_bound, 
			created_at__gte = time_lower_bound, 
			doc_id__in = doc_ids, 
			author_id = author_id)
		if viewlogs.count() >= 2:
			arr1 = viewlogs.order_by("-created_at")[0].heatmap.split(",")
			last_doc_id = viewlogs.order_by("-created_at")[0].doc.id
			arr2 = viewlogs.filter(doc_id = last_doc_id).order_by("-created_at")[1].heatmap.split(",")
			if len(arr1) == len(arr2):
				l1 = np.array([int(x) for x in arr1])
				l2 = np.array([int(x) for x in arr2])
				l = (l1 - l2).tolist()
				item = {}
				item["doc_id"] = viewlogs.order_by("-created_at")[0].doc_id
				first = l.index(1)
				last = len(l) - l[::-1].index(1) - 1
				item["work_on"] = (first + last) / 2
				item["author_name"] = User.objects.get(id = author_id).first_name + " " + User.objects.get(id = author_id).last_name
				item["time"] = utils.pretty_date(viewlogs.order_by("-created_at")[0].created_at)
				response["author_activity_map"][author_id] = item
	# nuggetmap
	response["nuggetmaps"] = {}
	nuggetmaps = NuggetMap.objects.filter(
		created_at__lte = time_upper_bound, 
		created_at__gte = time_lower_bound)
	if (nuggetmaps.count() != 0):
		for doc_id in doc_ids:
			length = get_doc_length(forum, doc_id)	# length is the numebr of chars
			length = length / num_word_for_each_unit  # num of segments within a doc
			distribution = np.array([0] * length)
			nuggetmaps2 = nuggetmaps.filter(doc_id = doc_id)
			if (nuggetmaps2.count() != 0 and author_ids[0] != "" and theme_ids[0] != ""):
				for author_id in author_ids:
					for theme_id in theme_ids:
						nuggetmaps3 = nuggetmaps2.filter(
							author_id = author_id, 
							theme_id = theme_id);
						if (nuggetmaps3.count() != 0):
							arr = nuggetmaps3.order_by("-created_at")[0].distribution.split(",")
							l = np.array([int(x) for x in arr])
							distribution = distribution + l
			response["nuggetmaps"][str(doc_id)] = {}
			response["nuggetmaps"][str(doc_id)]["distribution"] = distribution.tolist()
			response["nuggetmaps"][str(doc_id)]["doc_name"] = Doc.objects.get(id = doc_id).title
	# viewlog
	viewlogs = ViewLog.objects.all()
	viewlogs = viewlogs.filter(created_at__lte = time_upper_bound).filter(created_at__gte = time_lower_bound)
	response["viewlogs"] = {}
	for doc_id in doc_ids:
		viewlogs2 = viewlogs.filter(doc_id = doc_id)
		length = get_doc_length(forum, doc_id)
		length = length / num_word_for_each_unit  # length was the numebr of chars
		heatmap = np.array([0] * length)
		if (author_ids[0] != ""):
			for author_id in author_ids:
				viewlogs3 = viewlogs2.filter(author_id = author_id);
				if (viewlogs3.count() != 0):
					arr = viewlogs3.order_by("-created_at")[0].heatmap.split(",")
					l = np.array([int(x) for x in arr])
					heatmap = heatmap + l
		response["viewlogs"][str(doc_id)] = heatmap.tolist() 

	response["docs"] = []
	for doc_id in doc_ids:
		item = {}
		item["id"] = "doc-" + str(doc_id)
		item["name"] = str(Doc.objects.get(id = doc_id).title)
		response["docs"].append(item)
	return HttpResponse(json.dumps(response), content_type='application/json')

def put_viewlog(request):
	response = {}
	context = {}
	forum_id = request.session['forum_id']
	forum = Forum.objects.get(id = forum_id)
	upper = request.REQUEST.get('upper')
	lower = request.REQUEST.get('lower')
	height = request.REQUEST.get('height')
	doc_id = request.REQUEST.get('doc_id')
	author_id = request.REQUEST.get('author_id')
	viewlogs = ViewLog.objects.filter(doc_id = doc_id, author_id = author_id)
	if (viewlogs.count() > 1):
		viewlog_latest = viewlogs.order_by("-created_at")[0]
		heatmap = viewlog_latest.heatmap.split(",")
		heatmap = [int(x) for x in heatmap]
		length = len(heatmap)
	else:
		length = get_doc_length(forum, doc_id)
		length = length / num_word_for_each_unit
		heatmap = [0] * length
	left = int(round(length * (float)(upper) / (float)(height)))
	right = int(round(length * (float)(lower) / (float)(height)))
	right = min(right, length)
	for i in range(left, right): # include start and exclude end
		heatmap[i] = heatmap[i] + 1
	heatmap = ",".join(str(x) for x in heatmap)
	ViewLog.objects.create(doc_id = doc_id, author_id = author_id, created_at = timezone.now(), heatmap = heatmap)
	return HttpResponse(json.dumps(response), content_type='application/json')

def get_timerange(request):
	forum_id = request.session['forum_id']
	forum = Forum.objects.get(id = forum_id)
	# we only consider root docs by this moment
	root_docs = Doc.objects.filter(forum=forum, folder__isnull=True).order_by("order")
	nuggetmaps = NuggetMap.objects.filter(doc_id__in = root_docs.values('id'))
	viewlogs = ViewLog.objects.filter(doc_id__in = root_docs.values('id'))
	if (nuggetmaps.count() != 0 and viewlogs.count() != 0):
		time_upper_bound = max(nuggetmaps.order_by("-created_at")[0].created_at, viewlogs.order_by("-created_at")[0].created_at)
		time_lower_bound = min(nuggetmaps.order_by("created_at")[0].created_at, viewlogs.order_by("created_at")[0].created_at)
	elif nuggetmaps.count() != 0:
		time_upper_bound = nuggetmaps.order_by("-created_at")[0].created_at
		time_lower_bound = nuggetmaps.order_by("created_at")[0].created_at
	elif viewlogs.count() != 0:
		time_upper_bound = viewlogs.order_by("-created_at")[0].created_at
		time_lower_bound = viewlogs.order_by("created_at")[0].created_at
	else:
		time_upper_bound = datetime(2020, 1, 1, 1, 1)
		time_lower_bound = datetime(2010, 1, 1, 1, 1)
	time_upper_bound = timezone.localtime(time_upper_bound).strftime("%Y %m %d %H %M %S")
	time_lower_bound = timezone.localtime(time_lower_bound).strftime("%Y %m %d %H %M %S")
	response = {}
	response["time_upper_bound"] = time_upper_bound
	response["time_lower_bound"] = time_lower_bound
	return HttpResponse(json.dumps(response), content_type='application/json')

def get_entities(request):
	response = {}
	forum_id = request.session['forum_id']
	forum = Forum.objects.get(id = forum_id)
	# we only consider root docs by this moment
	response["docs"] = []
	root_docs = Doc.objects.filter(forum=forum, folder__isnull=True).order_by("order")
	for doc in root_docs:
		item = {}
		item["id"] = "doc-" + str(doc.id)
		item["name"] = str(doc.title)
		response["docs"].append( item )
	response["themes"] = []
	themes = ClaimTheme.objects.filter(forum=forum)
	for theme in themes:
		item = {}
		item["id"] = "theme-" + str(theme.id)
		item["name"] = str(theme.name)
		response["themes"].append( item )
	response["authors"] = []
	for role in Role.objects.filter(forum=forum, role="panelist"):
		author = role.user
		item = {}
		item["id"] = "author-" + str(author.id)
		item["name"] = "P" + str(author.id) + ":" + str(author.first_name) + " " + str(author.last_name)
		response["authors"].append( item )
	return HttpResponse(json.dumps(response), content_type='application/json')

def nuggetlens(request):
	response = {}
	forum = Forum.objects.get(id = request.session['forum_id'])
	is_open = request.REQUEST.get('is_open')
	author_id = request.REQUEST.get('author_id')
	if is_open == "true": is_open = True
	else: is_open = False
	NuggetLensInteraction.objects.create(is_open = is_open, author_id = author_id, created_at = timezone.now(), forum = forum)
	return HttpResponse(json.dumps(response), content_type='application/json')

def get_doc_length(forum, doc_id):
	length = 0
	for section in Doc.objects.get(id = doc_id).sections.all():
		section_segmented_text = section.getAttr(forum)["segmented_text"]
		length = length + len(re.findall(r"data-id", section_segmented_text))
	return length

