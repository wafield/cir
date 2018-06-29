from django.conf.urls import patterns, include, url
from django.contrib import admin

import settings
import user_views
import forum_views
import doc_views
import claim_views
import facilitator_views
import tag_views
import workbench_views
import chatter_views
import vis_views
# import sankey_views

import phase0
import phase1
import phase2
import phase4
import phase5

admin.autodiscover()

urlpatterns = patterns(
  '',
  url(r'^$', forum_views.home),
  url(r'^admin/?', include(admin.site.urls)),
  url(r'^api_register/$', user_views.register),
  url(r'^api_login/$', user_views.login_view),
  url(r'^api_logout/$', user_views.logout_view),
  url(r'^api_change_info/$', user_views.change_info),
  url(r'^api_doc/$', doc_views.api_doc),
  url(r'^api_highlight/$', doc_views.api_highlight),
  url(r'^api_annotation/$', doc_views.api_annotation),
  url(r'^api_qa/$', doc_views.api_qa),
  url(r'^api_claim/$', claim_views.api_claim),
  url(r'^api_get_claim/$', claim_views.api_get_claim),
  url(r'^api_get_slot/$', claim_views.api_get_slot),
  url(r'^api_draft_stmt/$', claim_views.api_draft_stmt),
  url(r'^api_claim_activities/$',
      claim_views.api_claim_activities),
  url(r'^api_claim_vote/$', claim_views.api_claim_vote),
  url(r'^api_claim_flag/$', claim_views.api_claim_flag),
  url(r'^api_get_flags/$', claim_views.api_get_flags),
  url(r'^api_tag/$', tag_views.api_tag),
  url(r'^api_tag_theme/$', facilitator_views.tag_theme),

  url(r'^workbench/api_load_all_documents/$',
      workbench_views.api_load_all_documents),
  url(r'^workbench/api_load_all_themes/$',
      workbench_views.api_load_all_themes),
  url(r'^workbench/api_load_highlights/$',
      workbench_views.api_load_highlights),
  url(r'^workbench/api_load_one_highlight/$',
      workbench_views.api_load_one_highlight),
  url(r'^workbench/api_get_claim_by_theme/$',
      workbench_views.api_get_claim_by_theme),
  url(r'^workbench/api_change_to_nugget/$',
      workbench_views.api_change_to_nugget),
  url(r'^workbench/api_change_to_nugget_1/$',
      workbench_views.api_change_to_nugget_1),
  url(r'^workbench/api_remove_nugget/$',
      workbench_views.api_remove_nugget),
  url(r'^workbench/api_add_claim/$',
      workbench_views.api_add_claim),
  url(r'^workbench/api_remove_claim/$',
      workbench_views.api_remove_claim),
  url(r'^workbench/api_get_toc/$',
      workbench_views.api_get_toc),
  url(r'^workbench/api_edit_claim/$',
      workbench_views.api_edit_claim),
  url(r'^workbench/api_assign_nugget/$',
      workbench_views.api_assign_nugget),
  url(r'^workbench/api_load_nugget_list/$',
      workbench_views.api_load_nugget_list),
  url(r'^workbench/api_load_nugget_list_partial/$',
      workbench_views.api_load_nugget_list_partial),
  url(r'^workbench/api_load_claim_list_partial/$',
      workbench_views.api_load_claim_list_partial),
  url(r'^workbench/api_get_doc_by_sec_id/$',
      workbench_views.api_get_doc_by_sec_id),
  url(r'^workbench/api_get_doc_by_hl_id/$',
      workbench_views.api_get_doc_by_hl_id),
  url(r'^workbench/api_get_doc_by_doc_id/$',
      workbench_views.api_get_doc_by_doc_id),
  url(r'^workbench/api_get_init_doc/$',
      workbench_views.api_get_init_doc),

  # url(r'^phase0/update_statement_questions/$', phase0.update_statement_questions),
  # url(r'^phase0/get_statement_comment_list/$', phase0.get_statement_comment_list),
  # url(r'^phase0/put_statement_comment/$', phase0.put_statement_comment),

  # url(r'^phase5/get_statement_comment_list/$', phase5.get_statement_comment_list),
  # url(r'^phase5/put_statement_comment/$', phase5.put_statement_comment),
  # url(r'^phase5/vote_issue/$', phase5.vote_issue),
  # url(r'^phase5/render_support_bar/$', phase5.render_support_bar),
  # url(r'^phase5/view_vote_result/$', phase5.view_vote_result),

  url(r'^phase1/get_nugget_list/$',
      phase1.get_nugget_list),
  url(r'^phase1/get_highlights/$', phase1.get_highlights),
  url(r'^phase1/get_nugget_comment_list/$',
      phase1.get_nugget_comment_list),
  url(r'^phase1/put_nugget_comment/$',
      phase1.put_nugget_comment),
  url(r'^phase1/get_statement_comment_list/$',
      phase1.get_statement_comment_list),
  url(r'^phase1/put_statement_comment/$',
      phase1.put_statement_comment),
  url(r'^phase1/change_nugget_theme/$',
      phase1.change_nugget_theme),
  url(r'^phase1/get_statement_version/$',
      phase1.get_statement_version),

  url(r'^phase2/get_claim_list/$', phase2.get_claim_list),
  url(r'^phase2/get_nugget_list/$',
      phase2.get_nugget_list),
  # url(r'^phase2/get_theme_list/$', phase2.get_theme_list),
  # url(r'^phase2/get_author_list/$', phase2.get_author_list),
  url(r'^phase2/put_claim/$', phase2.put_claim),
  url(r'^phase2/get_claim_activity/$',
      phase2.get_claim_activity),
  url(r'^phase2/add_nugget_to_claim/$',
      phase2.add_nugget_to_claim),
  url(r'^phase2/remove_nugget_from_claim/$',
      phase2.remove_nugget_from_claim),
  url(r'^phase2/suggest_claim/$', phase2.suggest_claim),
  url(r'^phase2/adopt_claim/$', phase2.adopt_claim),
  url(r'^phase2/add_comment_to_claim/$',
      phase2.add_comment_to_claim),
  url(r'^phase2/get_claim_comment_list/$',
      phase2.get_claim_comment_list),
  url(r'^phase2/put_claim_comment/$',
      phase2.put_claim_comment),

  url(r'^phase4/get_claim_list/$', phase4.get_claim_list),
  url(r'^phase4/get_statement_list/$',
      phase4.get_statement_list),
  url(r'^phase4/put_statement/$', phase4.put_statement),
  url(r'^phase4/add_claim_to_statement/$',
      phase4.add_claim_to_statement),
  # url(r'^phase2/update_question_isresolved/$', phase2.update_question_isresolved),
  # url(r'^phase2/vote_question/$', phase2.vote_question),
  # url(r'^phase2/vote_expert/$', phase2.vote_expert),
  # url(r'^phase2/expert_question/$', phase2.expert_question),
  # url(r'^phase2/delete_question/$', phase2.delete_question),

  # url(r'^sankey/get_graph/$', sankey_views.get_graph),
  # url(r'^sankey/get_doc/$', sankey_views.get_doc),
  # url(r'^sankey/get_doc_coverage/$', sankey_views.get_doc_coverage),
  # url(r'^sankey/get_entities/$', sankey_views.get_entities),
  # url(r'^sankey/put_viewlog/$', sankey_views.put_viewlog),
  # url(r'^sankey/get_viewlog/$', sankey_views.get_viewlog),
  # url(r'^sankey/put_nuggetmap/$', sankey_views.put_nuggetmap),
  # url(r'^sankey/get_nuggetmap/$', sankey_views.get_nuggetmap),
  # url(r'^sankey/get_highlights/$', sankey_views.get_highlights),
  # url(r'^sankey/get_highlights2/$', sankey_views.get_highlights2),
  # url(r'^sankey/get_timerange/$', sankey_views.get_timerange),
  # url(r'^sankey/nuggetlens/$', sankey_views.nuggetlens),

  url(r'^api_chatter/$', chatter_views.api_chatter),

  url(r'^api_register_delegator/$',
      facilitator_views.register_delegator),
  # include other apps
  url(r'^admin/doc/',
      include('django.contrib.admindocs.urls')),
  url(r'^password_reset/', include('password_reset.urls')),
  url(r'^api_dashboard/forum/$',
      facilitator_views.admin_forum),
  url(r'^api_dashboard/docs/$',
      facilitator_views.admin_document),
  url(r'^api_dashboard/phase/$', facilitator_views.phase),
  url(r'^api_dashboard/user_mgmt/$',
      facilitator_views.user_mgmt),
  url(r'^api_dashboard/msg/$',
      facilitator_views.admin_msg),
  url(r'^api_dashboard/get_pie/$',
      facilitator_views.get_pie),
  url(r'^api_dashboard/get_highlights/$',
      facilitator_views.get_highlights),
  url(r'^api_dashboard/theme/$', facilitator_views.theme),
  url(r'^api_dashboard/document/$',
      facilitator_views.document),

  # these must be put last!
  url(
    r'^(?P<forum_url>[a-zA-Z0-9_]+)(/phase/(?P<phase_name>[a-zA-Z0-9_]+))?/?$',
    forum_views.enter_forum),
  url(r'^(?P<forum_url>[a-zA-Z0-9_]+)/vis/?$',
      forum_views.enter_vis),
  url(r'^(?P<forum_url>[a-zA-Z0-9_]+)/workbench/?$',
      forum_views.enter_workbench),
  url(r'^(?P<forum_url>[a-zA-Z0-9_]+)/sankey/?$',
      forum_views.enter_sankey),
  url(
    r'^(?P<forum_url>[a-zA-Z0-9_]+)(/dashboard/(?P<dashboard_tab>[a-zA-Z0-9_]+))?/?$',
    facilitator_views.enter_dashboard),
  url(r'^(?P<forum_url>[a-zA-Z0-9_]+)/statement/?$',
      forum_views.enter_statement)

)

urlpatterns += patterns('',
                        (r'^media/(?P<path>.*)$', 'django.views.static.serve',
                         {'document_root': settings.MEDIA_ROOT}))

handler500 = forum_views.handler500
