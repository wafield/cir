from django.contrib.gis.db import models
from django.contrib.auth.models import User

from mptt.models import MPTTModel, TreeForeignKey

import utils
import datetime, time

VISITOR_ROLE = 'visitor'


class UserLogin(models.Model):
  user = models.ForeignKey(User, on_delete=models.CASCADE)
  timestamp = models.DateTimeField()


class Forum(models.Model):
  full_name = models.CharField(
    max_length=500)  # shown on top page/selection page
  short_name = models.CharField(max_length=500)  # used elsewhere
  url = models.CharField(max_length=100)  # used in url
  description = models.TextField(null=True, blank=True)
  ACCESS_CHOICES = (
    ('open', 'Open access'),
    ('panelist', 'Accessible only to the panel'),
    ('private', 'Visible only to the panel'),
  )
  PHASE_CHOICES = (
    ('paused', 'Paused'),
    ('not_started', 'Not started'),
    ('tagging', 'Tagging'),
    ('free_discuss', 'Discuss Questions'),  # phase 0
    ('nugget', 'Extract nugget'),  # phase 1
    ('extract', 'Assemble Claim'),  # phase 2
    ('categorize', 'Categorize Claim'),  # phase 3
    ('theming', 'Claim theme identification'),
    ('improve', 'Refine Statements'),  # phase 4
    ('finished', 'Finalize Statements')  # phase 5 statements
  )
  access_level = models.CharField(max_length=100, choices=ACCESS_CHOICES,
                                  default='private')
  phase = models.CharField(max_length=100, choices=PHASE_CHOICES,
                           default='not_started')
  contextmap = models.TextField(null=True, blank=True)
  forum_logo = models.ImageField(upload_to='forum_logos', null=True,
                                 blank=True,
                                 default='forum_logos/default.jpg')
  stmt_preamble = models.TextField(null=True, blank=True)

  def __unicode__(self):  # used for admin site
    return self.full_name + '(' + self.url + ')'

  def getAttr(self):
    attr = {}
    attr['id'] = self.id
    attr['full_name'] = self.full_name
    attr['short_name'] = self.short_name
    attr['url'] = self.url
    attr['full_description'] = self.description
    attr['short_description'] = self.description[:400] + '...'
    attr['phase'] = self.phase
    if self.access_level == 'open':
      attr['access_level'] = 'Open access'
    elif self.access_level == 'panelist':
      attr['access_level'] = 'Accessible only to the panel'
    elif self.access_level == 'private':
      attr['access_level'] = 'Visible only to the panel'
    else:
      attr['access_level'] = self.access_level
    attr['logo_url'] = self.forum_logo.url
    return attr


class Role(models.Model):
  ROLE_CHOICES = (
    ('panelist', 'Panelist'),
    ('expert', 'Subject Matter Expert'),
    ('facilitator', 'Facilitator'),
    ('analyst', 'Analyst'),
    ('visitor', 'Visitor'),
  )
  user = models.ForeignKey(User, related_name="role",
                           on_delete=models.CASCADE)
  forum = models.ForeignKey(Forum, related_name="members",
                            on_delete=models.CASCADE)
  role = models.CharField(max_length=20, choices=ROLE_CHOICES)


class UserInfo(models.Model):
  user = models.OneToOneField(User, related_name='info',
                              on_delete=models.CASCADE)
  description = models.TextField(null=True, blank=True)
  last_visited_forum = models.ForeignKey(Forum, null=True, blank=True,
                                         on_delete=models.CASCADE)


class EntryCategory(models.Model):
  CONTENT_CHOICES = (
    ('doc', 'Document'),
    ('post', 'Post'),
  )
  name = models.CharField(max_length=200, null=True, blank=True)
  category_type = models.CharField(max_length=10, choices=CONTENT_CHOICES)
  forum = models.ForeignKey(Forum, on_delete=models.CASCADE)
  visible = models.BooleanField(default=False)
  can_create = models.BooleanField(default=False)
  can_edit = models.BooleanField(default=False)
  can_delete = models.BooleanField(default=False)
  can_extract = models.BooleanField(default=False)
  can_prioritize = models.BooleanField(default=False)
  instructions = models.TextField(null=True, blank=True)

  def __unicode__(self):  # used for admin site
    return self.name or ''

  def getAttr(self):
    attr = {}
    attr['id'] = self.id
    attr['name'] = self.name
    attr['instructions'] = self.instructions
    return attr

  def getPrivileges(self):
    priv = {}
    priv['visible'] = self.visible
    priv['can_create'] = self.can_create
    priv['can_edit'] = self.can_edit
    priv['can_delete'] = self.can_delete
    priv['can_extract'] = self.can_extract
    priv['can_prioritize'] = self.can_prioritize
    return priv


class Entry(models.Model):
  forum = models.ForeignKey(Forum, on_delete=models.CASCADE)
  author = models.ForeignKey(User, on_delete=models.CASCADE)
  delegator = models.ForeignKey(User, null=True, blank=True,
                                related_name='delegated_entries',
                                on_delete=models.CASCADE)
  content = models.TextField(null=True, blank=True)
  created_at = models.DateTimeField()
  updated_at = models.DateTimeField()
  category = models.ForeignKey(EntryCategory, related_name='entries',
                               null=True, blank=True,
                               on_delete=models.CASCADE)
  is_deleted = models.BooleanField(default=False)
  collective = models.BooleanField(default=False)

  def __unicode__(self):
    return self.content

  def getAttr(self, forum):
    attr = {}
    try:
      attr['author_role'] = Role.objects.get(user=self.author,
                                             forum=forum).role
    except:
      attr['author_role'] = VISITOR_ROLE
    attr['id'] = self.id
    attr['author_id'] = self.author.id
    attr['author_name'] = self.author.get_full_name()
    try:
      attr['author_initial'] = str.upper(
        str(self.author.first_name[0]) + str(self.author.last_name[0]))
    except:
      attr['author_initial'] = ''
    attr['content'] = self.content
    attr['created_at_full'] = self.created_at  # for sorting
    attr['updated_at'] = utils.pretty_date(self.updated_at)
    attr['updated_at_full'] = self.updated_at
    attr['is_deleted'] = self.is_deleted
    attr['collective'] = self.collective
    return attr

  def getAuthor(self):
    attr = {}
    attr['author_id'] = self.author.id
    attr['author_name'] = self.author.get_full_name()
    attr['author_intro'] = UserInfo.objects.get(
      user=self.author).description
    return attr


class Doc(models.Model):
  forum = models.ForeignKey(Forum, on_delete=models.CASCADE)
  title = models.TextField()
  description = models.TextField(null=True, blank=True)
  folder = models.ForeignKey(EntryCategory, related_name='doc_entries',
                             null=True, blank=True,
                             on_delete=models.CASCADE)
  order = models.TextField(null=True, blank=True)

  # def __str__(self):  # used for admin site
  #     return self.title

  def getAttr(self):
    attr = {}
    attr['id'] = self.id
    attr['title'] = self.title
    attr['description'] = self.description
    attr['num_sections'] = self.sections.count()
    try:
      # update time is the latest updated section in it
      update_time = self.sections.order_by('-updated_at')[0].updated_at
      attr['updated_at'] = utils.pretty_date(update_time)
      attr['updated_at_full'] = update_time
    except:
      pass
    return attr


class DocSection(Entry):
  title = models.TextField(null=True, blank=True)
  order = models.IntegerField(null=True, blank=True)
  doc = models.ForeignKey(Doc, related_name='sections',
                          on_delete=models.CASCADE)

  def __str__(self):  # used for admin site
    return str(self.id) + ' ' + self.title

  def getAttrAdmin(self):
    attr = {}
    attr['id'] = self.id
    attr['title'] = self.title
    attr['author_name'] = self.author.get_full_name()
    attr['content'] = self.content
    attr['updated_at'] = utils.pretty_date(self.updated_at)
    attr['updated_at_full'] = self.updated_at
    attr['order'] = self.order
    return attr

  def getAttr(self, forum):
    attr = {}
    attr['id'] = self.id
    attr['title'] = self.title
    attr['segmented_text'] = utils.segment_text(self.content)
    attr['updated_at'] = utils.pretty_date(self.updated_at)
    attr['updated_at_full'] = self.updated_at
    return attr


class ClaimTheme(models.Model):
  forum = models.ForeignKey(Forum, on_delete=models.CASCADE)
  name = models.CharField(max_length=100)
  description = models.TextField()

  def getAttr(self):
    attr = {}
    attr['id'] = self.id
    attr['name'] = self.name
    attr['description'] = self.description
    return attr

  def __unicode__(self):
    return self.name


class Highlight(models.Model):
  upper_bound = models.FloatField(null=True, blank=True)
  lower_bound = models.FloatField(null=True, blank=True)
  start_pos = models.IntegerField()
  end_pos = models.IntegerField()
  context = models.ForeignKey(Entry, related_name='highlights',
                              on_delete=models.CASCADE)
  author = models.ForeignKey(User, on_delete=models.CASCADE)
  theme = models.ForeignKey(ClaimTheme, null=True, blank=True,
                            on_delete=models.CASCADE)

  # False: question. True: nugget.
  is_nugget = models.BooleanField(default=True)
  text = models.TextField(null=True, blank=True)
  created_at = models.DateTimeField()

  def getAttr(self):
    attr = {}
    attr['created_at'] = time.mktime(self.created_at.timetuple())
    attr['created_at_pretty'] = utils.pretty_date(self.created_at)
    attr['id'] = self.id
    attr['start'] = self.start_pos
    attr['end'] = self.end_pos
    attr['author_id'] = self.author.id
    attr['context_id'] = self.context.id
    attr['text'] = self.text
    attr['is_nugget'] = self.is_nugget
    attr['is_used'] = HighlightClaim.objects.filter(
      highlight_id=self.id).count() > 0
    attr[
      'author_name'] = self.author.first_name + " " + self.author.last_name
    attr['theme'] = ""
    attr['theme_id'] = ""
    try:
      tag = Tag.objects.get(highlight_ptr=self)
      attr['content'] = tag.content
      attr['type'] = 'tag'
    except:
      # type of the first entry under this highlight
      # claim has priority
      if self.posts_of_highlight.exists():
        attr['type'] = self.posts_of_highlight.order_by('updated_at')[
          0].content_type
      else:
        # ghost highlight with no entries attached
        attr['type'] = 'claim'
    return attr


class ClaimVersion(Entry):
  claim = models.ForeignKey('Claim', related_name='versions',
                            on_delete=models.CASCADE)
  is_adopted = models.BooleanField(default=True)
  order = models.IntegerField(null=True, blank=True)

  def getAttr(self, forum):
    attr = super(ClaimVersion, self).getAttr(forum)
    attr['version_id'] = attr['id']
    attr['entry_type'] = 'claim version'
    attr['is_adopted'] = self.is_adopted
    attr['claim_ids'] = StatementClaim.objects.filter(
      statement=attr['id']).values_list("claim_id", flat=True)
    attr['num_comments'] = StatementComment.objects.filter(
      claim_version=self).count()
    return attr

  # get id, author and time only
  def getAttrSimple(self):
    return {
      'id': self.id,
      'entry_type': 'Claim',
      'created_at': self.created_at.isoformat(),
    }

  # for claim navigator
  def getExcerpt(self, forum):
    attr = {}  # for efficiency, don't inherit at all
    attr['version_id'] = self.id
    attr['updated_at_full'] = self.updated_at
    attr['updated_at'] = utils.pretty_date(self.updated_at)
    attr['excerpt'] = self.content[:50] + '...'
    return attr


class Claim(Entry):
  title = models.TextField(null=True, blank=True)
  published = models.BooleanField(default=True)

  # If null, it's a regular claim. If not null, it's a slot question.
  stmt_order = models.IntegerField(null=True, blank=True)
  CATEGORY_CHOICES = (
    ('pro', 'Pro'),
    ('con', 'Con'),
    ('finding', 'finding'),
    ('opinion', 'Opinion'),
    ('discarded', 'Discarded'),
    ("pending", "Pending")
  )
  claim_category = models.CharField(max_length=20, choices=CATEGORY_CHOICES,
                                    null=True, blank=True)
  theme = models.ForeignKey(ClaimTheme, null=True, blank=True,
                            on_delete=models.CASCADE)
  # the highlight from which this claim is extracted
  # source_highlight = models.ForeignKey(Highlight, null=True, blank=True, related_name='claims_of_highlight')
  source_highlights = models.ManyToManyField(Highlight,
                                             through='HighlightClaim')

  def __unicode__(self):
    if self.adopted_versions().count() == 0:
      return '(No adopted version)'
    if self.adopted_versions().count() == 1:
      return self.adopted_version().content
    return '(Multiple adopted versions)'

  def adopted_version(self):
    return self.versions.get(is_adopted=True)

  def adopted_versions(self):
    return self.versions.filter(is_adopted=True).order_by("order")

  # get id, author and time only
  def getAttrSimple(self):
    return {
      'id': self.id,
      'entry_type': 'Claim',
      'created_at': self.created_at.isoformat(),
    }

  def getAttr(self, forum):
    attr = self.adopted_version().getAttr(forum)
    attr['id'] = self.id
    attr['entry_type'] = 'claim'
    attr['category'] = self.claim_category
    if self.theme:
      attr['theme'] = self.theme.name
    if self.newer_versions.filter(refer_type='merge').exists():
      # is outdated!
      attr['is_merged'] = '.'.join(
        [str(claimref.to_claim.id) for claimref in
         self.newer_versions.filter(refer_type='merge')])
    if self.older_versions.filter(refer_type='merge').exists():
      # is generated by merging other claims!
      attr['merge_of'] = '.'.join(
        [str(claimref.from_claim.id) for claimref in
         self.older_versions.filter(refer_type='merge')])
    if self.newer_versions.filter(refer_type='stmt').exists():
      # is used in statement
      attr['is_stmt'] = True
    attr['slots'] = []
    for claimref in ClaimReference.objects.filter(refer_type="stmt",
                                                  from_claim=self):
      slot = claimref.to_claim
      attr['slots'].append({
        'slot_id': slot.id,
        'slot_category': slot.claim_category,
        'slot_order': slot.stmt_order
      })
    return attr

  def getAttrSlot(self, forum):
    """
    Get (1) nuggets, (2) composed claims, (3) statement candidates (adopted versions)
    for a question slot. "self" is the slot question.
    :param forum:
    :return:
    """
    attr = super(Claim, self).getAttr(forum)
    attr['slot_title'] = self.title  # Question content
    attr['category'] = self.claim_category
    attr['nuggets'] = []
    attr['claims'] = []
    attr['statements'] = []

    attr['stmt_order'] = self.stmt_order

    for claimref in self.older_versions.filter(refer_type='stmt'):
      # A src_claim is a statement in this slot.
      src_claim = claimref.from_claim
      attr['statements'].append({
        'id': src_claim.id,
        'content': src_claim.adopted_version().content,
        'author_name': src_claim.author.get_full_name(),
        'author_id': src_claim.author.id,

        'created_at_pretty': src_claim.adopted_version().created_at,

        # List of statements that this claim has been used in.
        'statement_ids': StatementClaim.objects.filter(
          claim_id=src_claim.id).values_list("statement_id",
                                             flat=True),
        'num_statements': StatementClaim.objects.filter(
          claim_id=src_claim.id).count(),
        'comment_number': ClaimComment.objects.filter(
          claim_id=src_claim.id).count()
      })

    for claimref in self.older_versions.filter(refer_type='claim'):
      # A src_claim is a claim in this slot.
      src_claim = claimref.from_claim
      attr['claims'].append({
        'id': src_claim.id,
        'content': src_claim.adopted_version().content,
        'author_name': src_claim.author.get_full_name(),
        'author_id': src_claim.author.id,

        'created_at_pretty': src_claim.adopted_version().created_at,

        # List of statements that this claim has been used in.
        'statement_ids': StatementClaim.objects.filter(
          claim_id=src_claim.id).values_list("statement_id",
                                             flat=True),
        'num_statements': StatementClaim.objects.filter(
          claim_id=src_claim.id).count(),
        'comment_number': ClaimComment.objects.filter(
          claim_id=src_claim.id).count()
      })

    for claimref in self.older_versions.filter(refer_type='nugget'):
      # A src_claim is a nugget in this slot.
      src_claim = claimref.from_claim
      attr['nuggets'].append({
        'id': src_claim.id,
        'content': src_claim.adopted_version().content,
        'author_name': src_claim.author.get_full_name(),
        'author_id': src_claim.author.id,

        'created_at_pretty': src_claim.adopted_version().created_at,

        # List of statements that this claim has been used in.
        'statement_ids': StatementClaim.objects.filter(
          claim_id=src_claim.id).values_list("statement_id",
                                             flat=True),
        'num_statements': StatementClaim.objects.filter(
          claim_id=src_claim.id).count(),
        'comment_number': ClaimComment.objects.filter(
          claim_id=src_claim.id).count()
      })
      attr['nuggets'] = sorted(attr['nuggets'],
                               key=lambda k: k['num_statements'],
                               reverse=True)
    return attr

  def getAttrStmt(self):
    attr = {}
    attr['id'] = self.id
    attr['content'] = self.adopted_version().content
    if self.theme:
      attr['theme'] = self.theme.name
    return attr

  def getExcerpt(self, forum):  # used for claim navigator
    attr = self.adopted_version().getExcerpt(forum)
    attr['id'] = self.id
    return attr


class ClaimReference(models.Model):
  TYPE_CHOICES = (
    ('merge', 'Merge'),
    ('nugget', 'Is nugget to slot.'),
    ('stmt', 'Is statement to slot.'),
    ('claim', 'Is claim to slot.'),
    ('nug2claim', 'Is Nugget to Claim'),
    ('claim2stmt', 'Is Claim to Statement'),
  )
  refer_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
  from_claim = models.ForeignKey(Claim, related_name='newer_versions',
                                 on_delete=models.CASCADE)
  to_claim = models.ForeignKey(Claim, related_name='older_versions',
                               on_delete=models.CASCADE)


class StatementVersion(models.Model):
  claim_version = models.ForeignKey(ClaimVersion,
                                    related_name='statement_versions',
                                    on_delete=models.CASCADE)
  text = models.TextField()
  author = models.ForeignKey(User, on_delete=models.CASCADE)
  updated_at = models.DateTimeField()


class Event(models.Model):  # the behavior of a user on an entry
  forum = models.ForeignKey(Forum, on_delete=models.CASCADE)
  user = models.ForeignKey(User, on_delete=models.CASCADE)
  delegator = models.ForeignKey(User, null=True, blank=True,
                                related_name='delegated_events',
                                on_delete=models.CASCADE)
  entry = models.ForeignKey(Entry, related_name='events',
                            on_delete=models.CASCADE)
  created_at = models.DateTimeField()
  collective = models.BooleanField(default=False)

  def getAttr(self, forum):
    attr = {}
    attr['id'] = self.id
    attr['user_id'] = self.user.id
    attr['user_name'] = self.user.get_full_name()
    attr['author_intro'] = UserInfo.objects.get(user=self.user).description
    try:
      attr['author_role'] = Role.objects.get(user=self.user,
                                             forum=forum).role
    except:
      attr['author_role'] = VISITOR_ROLE
    try:
      attr['author_initial'] = str.upper(
        str(self.user.first_name[0]) + str(self.user.last_name[0]))
    except:
      attr['author_initial'] = ''
    attr['created_at_full'] = self.created_at  # for sorting
    attr['created_at'] = utils.pretty_date(self.created_at)
    attr['collective'] = self.collective
    return attr


class ClaimThemeAssignment(Event):
  EVENT_CHOICES = (
    ('add_theme', 'Add a theme'),
    ('remove_theme', 'Remove a theme'),
  )
  claim = models.ForeignKey(Claim)
  theme = models.ForeignKey(ClaimTheme)
  event_type = models.CharField(max_length=20, choices=EVENT_CHOICES)

  def getAttr(self, forum):
    attr = super(ClaimThemeAssignment, self).getAttr(forum)
    attr['entry_type'] = 'claim_theme_assignment'
    attr['action'] = self.event_type
    attr['claim_id'] = self.entry.id
    return attr


class ClaimNuggetAssignment(Event):
  EVENT_CHOICES = (
    ('add', 'Add a nugget'),
    ('remove', 'Remove a nugget'),
  )
  claim = models.ForeignKey(Claim)
  nugget = models.ForeignKey(Claim, related_name='nugget_assignment_events')
  event_type = models.CharField(max_length=20, choices=EVENT_CHOICES)

  def getAttr(self, forum):
    attr = super(ClaimNuggetAssignment, self).getAttr(forum)
    attr['entry_type'] = 'claim_nugget_assignment'
    attr['action'] = self.event_type
    attr['claim_id'] = self.claim.id
    attr['nugget_id'] = self.nugget.id
    return attr


class SlotAssignment(Event):
  EVENT_CHOICES = (
    ('add', 'Add to slot'),
    ('remove', 'Remove from slot'),
  )
  slot = models.ForeignKey(Claim)
  event_type = models.CharField(max_length=20, choices=EVENT_CHOICES)
  author = models.ForeignKey(User, on_delete=models.CASCADE, null=True,
                             blank=True)

  def getAttr(self, forum):
    attr = super(SlotAssignment, self).getAttr(forum)
    attr['entry_type'] = 'slotassignment'
    attr['action'] = self.event_type
    attr['claim_id'] = self.entry.id
    attr['claim_text'] = Claim.objects.get(
      id=self.entry.id).adopted_version().content
    return attr


class Vote(Event):
  VOTE_CHOICES = (
    ('pro', 'Pro'),
    ('con', 'Con'),
    ('finding', 'Key Finding'),
    ('discarded', 'Discarded'),
    ('prioritize', 'Prioritize'),
    ('like', 'Like a version'),  # not shown in activity feed
    ('reword', 'Needs rewording'),
    ('merge', 'Needs merging'),
  )
  vote_type = models.CharField(max_length=20, choices=VOTE_CHOICES)
  reason = models.CharField(max_length=2010, null=True, blank=True)

  def getEntryType(self):
    if self.vote_type == 'reword' or self.vote_type == 'merge':
      return 'improve'
    if self.vote_type == 'pro' or self.vote_type == 'con' or self.vote_type == 'finding' or self.vote_type == 'discarded':
      return 'categorize'
    if self.vote_type == 'prioritize' or self.vote_type == 'like':
      return 'prioritize'
    return '(unknown)'

  # get id, author and time only
  def getAttrSimple(self):
    return {
      'id': self.id,
      'entry_type': 'Vote - ' + self.getEntryType(),
      'created_at': self.created_at.isoformat(),
    }

  def getAttr(self, forum):
    attr = super(Vote, self).getAttr(forum)
    attr['entry_type'] = self.getEntryType()
    attr['vote_type'] = self.vote_type
    attr['vote_type_full'] = self.get_vote_type_display()
    if self.reason:
      attr['reason'] = self.reason
    return attr


class Tag(Highlight):
  content = models.TextField()
  claimTheme = models.ForeignKey(ClaimTheme, related_name="tags", null=True,
                                 blank=True, on_delete=models.CASCADE)

  def getAttr(self):
    attr = super(Tag, self).getAttr()
    attr['content'] = self.content
    if self.claimTheme:
      attr['claimTheme'] = self.claimTheme.name
    return attr


class ThemeAssignment(Event):
  theme = models.ForeignKey(ClaimTheme, on_delete=models.CASCADE)

  def getAttr(self, forum):
    attr = super(ThemeAssignment, self).getAttr(forum)
    attr['entry_type'] = 'themeassignment'
    attr['theme_name'] = self.theme.name
    return attr


class Post(Entry):  # in discussion
  title = models.TextField(null=True, blank=True)
  target_entry = models.ForeignKey(Entry, related_name='comments_of_entry',
                                   null=True, blank=True,
                                   on_delete=models.CASCADE)  # for comments of a claim
  target_event = models.ForeignKey(Event, related_name='comments_of_event',
                                   null=True, blank=True,
                                   on_delete=models.CASCADE)  # for comments of an event
  # the highlight to which this post is attached
  highlight = models.ForeignKey(Highlight, related_name='posts_of_highlight',
                                null=True, blank=True,
                                on_delete=models.CASCADE)
  CONTENT_CHOICES = (
    ('question', 'Question'),
    ('comment', 'Comment'),
  )
  content_type = models.CharField(max_length=10, choices=CONTENT_CHOICES)

  def getTree(self, exclude_root):
    nodes = []
    if not exclude_root and not self.is_deleted:
      nodes = [self]
    for comment in self.comments_of_entry.all():
      nodes.extend(comment.getTree(exclude_root=False))
    return nodes

  # get id, author and time only
  def getAttrSimple(self):
    return {
      'id': self.id,
      'entry_type': self.content_type,
      'created_at': self.created_at.isoformat()
    }

  def getAttr(self, forum):
    attr = super(Post, self).getAttr(forum)
    attr['entry_type'] = self.content_type
    attr['author_id'] = self.author.id
    attr['author_name'] = self.author.get_full_name()
    attr['author_intro'] = UserInfo.objects.get(
      user=self.author).description
    if self.target_entry:
      try:
        order = self.target_entry.stmt_order  # see if it's a slot
      except:
        attr['parent_name'] = self.target_entry.author.get_full_name()
        attr['parent_id'] = self.target_entry.id
    if self.target_event:
      attr['parent_name'] = self.target_event.user.get_full_name()
      attr['parent_id'] = self.target_event.id
    return attr


class Message(models.Model):
  forum = models.ForeignKey(Forum)
  sender = models.ForeignKey(User, related_name='msg_of_sender')
  receiver = models.ForeignKey(User, related_name='msg_of_receiver')
  target_entry = models.ForeignKey(Entry, null=True, blank=True)
  content = models.TextField(null=True, blank=True)
  created_at = models.DateTimeField()
  unread = models.BooleanField(default=True)
  CONTENT_CHOICES = (
    ('facilitation', 'Facilitation message'),
    ('facilitation-action', 'Facilitation message - Action required'),
    ('post', 'Post'),
    ('post-action', 'Post - Attention requested'),
    ('reply', 'Reply'),
    ('reply-action', 'Reply - Attention requested'),
    ('version', 'Version'),
    ('version-action', 'Version - Attention requested'),
  )
  is_done = models.BooleanField(default=False)

  content_type = models.CharField(max_length=20, choices=CONTENT_CHOICES)

  def getAttr(self):
    attr = {
      'id': self.id,
      'sender': self.sender.get_full_name(),
      'receiver': self.receiver.get_full_name(),
      'content': self.content,
      'created_at_full': self.created_at,  # for sorting
      'created_at': utils.pretty_date(self.created_at),
      'content_type': self.content_type,
    }
    if 'facilitation' in self.content_type or 'action' in self.content_type:
      attr['important'] = 'important'
    if not self.unread:
      attr['is_read'] = 'read'
    if self.is_done:
      attr['is_done'] = 'done'
    if self.target_entry:
      attr['source_id'] = self.target_entry.id
    return attr


class ChatMessage(models.Model):
  source = models.ForeignKey(User, related_name='get_source',
                             on_delete=models.CASCADE)
  target = models.ForeignKey(User, null=True, blank=True,
                             on_delete=models.CASCADE)
  reply_target = models.ForeignKey('self', related_name='replies', null=True,
                                   blank=True, on_delete=models.CASCADE)
  content = models.TextField(null=True, blank=True)
  created_at = models.DateTimeField()
  forum = models.ForeignKey(Forum, null=True, blank=True,
                            on_delete=models.CASCADE)

  def __unicode__(self):
    return self.content

  def getAttr(self):
    attr = {}
    try:
      attr['role'] = Role.objects.get(user=self.source,
                                      forum=self.forum).role
    except:
      attr['role'] = VISITOR_ROLE
    attr['id'] = self.id
    attr['user_id'] = self.source.id
    attr['user_name'] = self.source.get_full_name()
    attr['content'] = self.content
    attr['created_at'] = utils.pretty_date(self.created_at)
    return attr


class HighlightClaim(models.Model):
  claim = models.ForeignKey(Claim, on_delete=models.CASCADE)
  highlight = models.ForeignKey(Highlight, on_delete=models.CASCADE)


class ClaimAndTheme(models.Model):
  claim = models.ForeignKey(Claim, on_delete=models.CASCADE)
  theme = models.ForeignKey(ClaimTheme, on_delete=models.CASCADE)


class SankeyWorkbench(models.Model):
  forum = models.ForeignKey(Forum, on_delete=models.CASCADE)
  author = models.ForeignKey(User, on_delete=models.CASCADE)
  content = models.TextField(null=True, blank=True)


class SankeyScreenshot(models.Model):
  content = models.TextField(null=True, blank=True)


class ViewLog(models.Model):
  heatmap = models.TextField(null=True, blank=True)
  doc = models.ForeignKey(Doc, related_name='viewlogs',
                          on_delete=models.CASCADE)
  author = models.ForeignKey(User, related_name='viewlogs',
                             on_delete=models.CASCADE)
  created_at = models.DateTimeField(null=True, blank=True)


class NuggetMap(models.Model):
  distribution = models.TextField(null=True, blank=True)
  doc = models.ForeignKey(Doc, related_name='nuggetmaps',
                          on_delete=models.CASCADE)
  author = models.ForeignKey(User, related_name='nuggetmaps',
                             on_delete=models.CASCADE)
  theme = models.ForeignKey(ClaimTheme, related_name='nuggetmaps',
                            on_delete=models.CASCADE)
  created_at = models.DateTimeField(null=True, blank=True)


class NuggetLensInteraction(models.Model):
  author = models.ForeignKey(User, on_delete=models.CASCADE)
  created_at = models.DateTimeField(null=True, blank=True)
  is_open = models.BooleanField(default=False)
  forum = models.ForeignKey(Forum, null=True, blank=True,
                            on_delete=models.CASCADE)


class NuggetComment(MPTTModel):
  text = models.CharField(max_length=999)
  parent = TreeForeignKey('self', null=True, blank=True,
                          related_name='children', db_index=True)
  author = models.ForeignKey(User, on_delete=models.CASCADE)
  highlight = models.ForeignKey(Highlight)
  created_at = models.DateTimeField()


class StatementComment(MPTTModel):
  text = models.CharField(max_length=999)
  parent = TreeForeignKey('self', null=True, blank=True,
                          related_name='children', db_index=True)
  author = models.ForeignKey(User, on_delete=models.CASCADE)
  claim_version = models.ForeignKey(ClaimVersion)
  created_at = models.DateTimeField()

  class MPTTMeta:
    order_insertion_by = ['-created_at']

  def get_author_name(self):
    return self.author.first_name + " " + self.author.last_name

  def get_datetime(self):
    return utils.pretty_date(self.created_at)


class StatementQuestionComment(MPTTModel):
  text = models.CharField(max_length=999)
  parent = TreeForeignKey('self', null=True, blank=True,
                          related_name='children', db_index=True)
  author = models.ForeignKey(User, on_delete=models.CASCADE)
  statement_question = models.ForeignKey(Claim)
  created_at = models.DateTimeField()

  class MPTTMeta:
    order_insertion_by = ['-created_at']

  def get_author_name(self):
    return self.author.first_name + " " + self.author.last_name

  def get_datetime(self):
    return utils.pretty_date(self.created_at)


class ClaimComment(MPTTModel):
  text = models.CharField(max_length=999)
  parent = TreeForeignKey('self', null=True, blank=True,
                          related_name='children', db_index=True)
  author = models.ForeignKey(User, on_delete=models.CASCADE)
  claim = models.ForeignKey(Claim, null=True, blank=True)
  nugget = models.ForeignKey(Highlight, null=True, blank=True)
  created_at = models.DateTimeField()
  CONTENT_CHOICES = (
    ('question', 'Question'),
    ('comment', 'Comment'),
  )
  comment_type = models.CharField(max_length=10, choices=CONTENT_CHOICES)
  is_answered = models.BooleanField(default=False)
  is_expert = models.BooleanField(default=False)
  forum = models.ForeignKey(Forum, null=True, blank=True,
                            on_delete=models.CASCADE)

  def getAttr(self):
    attr = {}
    attr['id'] = self.id
    attr['author_id'] = self.author.id
    attr['author_name'] = self.author.get_full_name()
    attr['author_intro'] = UserInfo.objects.get(
      user=self.author).description
    attr['text'] = self.text
    attr['created_at_full'] = self.created_at  # for sorting
    attr['created_at_pretty'] = utils.pretty_date(self.created_at)
    return attr


class ClaimQuestionVote(models.Model):
  question = models.ForeignKey(ClaimComment)
  voter = models.ForeignKey(User)
  created_at = models.DateTimeField()


class QuestionNeedExpertVote(models.Model):
  question = models.ForeignKey(ClaimComment)
  voter = models.ForeignKey(User)
  created_at = models.DateTimeField()


class ComplexPhase(models.Model):
  PHASE_CHOICES = (
    ('paused', 'Paused'),
    ('not_started', 'Not started'),
    ('tagging', 'Tagging'),
    ('free_discuss', 'Discuss Questions'),  # phase 0
    ('nugget', 'Extract nugget'),  # phase 1
    ('extract', 'Assemble Claim'),  # phase 2
    ('categorize', 'Categorize Claim'),  # phase 3
    ('theming', 'Claim theme identification'),
    ('improve', 'Refine Statements'),  # phase 4
    ('finished', 'Finalize Statements')  # phase 5 statements
  )
  name = models.CharField(max_length=20, choices=PHASE_CHOICES)
  description = models.TextField(null=True, blank=True)
  start_time = models.DateTimeField()
  end_time = models.DateTimeField()
  forum = models.ForeignKey(Forum)
  status = models.SmallIntegerField(
    default=2)  # 0 complete, 1 current focus, 2 to complete


class PinMessage(models.Model):
  content = models.TextField(null=True, blank=True)
  phase = models.ForeignKey(ComplexPhase, related_name='pin_messages')
  is_show = models.BooleanField(default=False)


class StatementClaim(models.Model):
  statement = models.ForeignKey(ClaimVersion, on_delete=models.CASCADE)
  claim = models.ForeignKey(Claim, on_delete=models.CASCADE)


class ForumComment(MPTTModel):
  text = models.CharField(max_length=999)
  parent = TreeForeignKey('self', null=True, blank=True,
                          related_name='children', db_index=True)
  author = models.ForeignKey(User, on_delete=models.CASCADE)
  forum = models.ForeignKey(Forum)
  created_at = models.DateTimeField()

  class MPTTMeta:
    order_insertion_by = ['-created_at']

  def get_author_name(self):
    return self.author.first_name + " " + self.author.last_name

  def get_datetime(self):
    return utils.pretty_date(self.created_at)

  def get_vote(self):
    if (ForumVote.objects.filter(forum=self.forum,
                                 author=self.author).count() > 0):
      return \
        ForumVote.objects.filter(forum=self.forum, author=self.author)[
          0].support
    return None


class ForumVote(models.Model):
  support = models.BooleanField(default=True)
  reason = models.CharField(max_length=2010, null=True, blank=True)
  forum = models.ForeignKey(Forum)
  author = models.ForeignKey(User, on_delete=models.CASCADE)
