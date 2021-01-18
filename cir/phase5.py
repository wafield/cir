import json

from django.template.loader import render_to_string
from django.http import HttpResponse
from django.utils import timezone
from django.shortcuts import render_to_response

from cir.models import *
import claim_views

from cir.phase_control import PHASE_CONTROL
import utils

def get_statement_comment_list(request):
    response = {}
    context = {}
    forum = Forum.objects.get(id = request.session['forum_id'])
    thread_comments = ForumComment.objects.filter(forum = forum)
    print thread_comments
    context['comments'] = thread_comments
    response['forum_comment'] = render_to_string("phase5/forum-comment.html", context)
    return HttpResponse(json.dumps(response), mimetype='application/json')

def put_statement_comment(request):
    response = {}
    context = {}
    author = request.user
    parent_id = request.REQUEST.get('parent_id')
    text = request.REQUEST.get('text')
    created_at = timezone.now()
    forum = Forum.objects.get(id = request.session['forum_id'])
    if parent_id == "": #root node
        newForumComment = ForumComment(author = author, text = text, forum = forum, created_at = created_at)
    else:
        parent = ForumComment.objects.get(id = parent_id)
        newForumComment = ForumComment(author = author, text = text, forum = forum, parent = parent, created_at = created_at)
    newForumComment.save()
    return HttpResponse(json.dumps(response), mimetype='application/json')

def vote_issue(request):
    reason = request.REQUEST.get('reason')
    author = request.user
    forum = Forum.objects.get(id = request.session['forum_id'])
    support = True 
    if (request.REQUEST.get('support') == "false"): support = False
    vote, created = ForumVote.objects.get_or_create(forum = forum, author = author)
    vote.reason = reason
    vote.support = support
    vote.save()
    response = {}
    return HttpResponse(json.dumps(response), mimetype='application/json')

def render_support_bar(request):
    author = request.user
    forum = Forum.objects.get(id = request.session['forum_id'])
    response = {}
    response["num_support"] = ForumVote.objects.filter(forum = forum, support = True).count()
    response["num_oppose"] = ForumVote.objects.filter(forum = forum, support = False).count()
    if request.user.is_authenticated():
        response["my_num_support"] = ForumVote.objects.filter(forum = forum, support = True, author = author).count()
        response["my_num_oppose"] = ForumVote.objects.filter(forum = forum, support = False, author = author).count()
    return HttpResponse(json.dumps(response), mimetype='application/json')

def view_vote_result(request):
    author = request.user
    forum = Forum.objects.get(id = request.session['forum_id'])
    response = {}
    context = {}
    context["entries"] = ForumVote.objects.filter(forum = forum)
    response["vote_result_table"] = render_to_string('phase5/vote-result-table.html', context)
    return HttpResponse(json.dumps(response), mimetype='application/json')