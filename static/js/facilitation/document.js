define([
	'jquery.ui' // for sortable
], function(

) {
	var module = {};
	module.$el = $('#feng-document-container');
	module.init = function() {
		module.$el.on('click', '.open-doc', function() {
			var doc_id = this.getAttribute('data-id');
			var doc_title = $(this).text();
			$.ajax({
				url: '/api_dashboard/document/',
				type: 'post',
				data: {
					'action': 'get-doc',
					'doc_id': doc_id
				},
				success: function(xhr) {
					module.currentDocId = doc_id;
					$('#doc-content').html(xhr.html);
					$('#doc-content').css('opacity', 1.0);
					$('.new-docsection.segment').show();
					$('#doc-dest-name').text(doc_title);
					$('#doc-content .section-title').mousedown(function() {
						$('#doc-content .section').addClass('shortened');
					}).mouseup(function() {
						$('#doc-content .section').removeClass('shortened');
					});
					$('#doc-content').sortable({
						axis: 'y',
						items: '> .section',
						helper: 'clone',
						containment: '#doc-content',
						scrollSensitivity: 10,
						placeholder: 'sortable-placeholder',
						start: function(event, ui) {
							$('#doc-content .section-content').hide();
						},
						stop: function(event, ui) {
							$('#doc-content').css('opacity', 0.7);
							var orders = {};
							$('#doc-content .section').each(function(idx) {
								orders[this.getAttribute('data-id')] = idx + 1;
							});
							$.ajax({
								url: '/api_dashboard/document/',
								type: 'post',
								data: {
									'action': 'reorder',
									'order': JSON.stringify(orders)
								},
								success: function(xhr) {
									$('#doc-categories .open-doc[data-id="' + module.currentDocId + '"]').trigger('click');
								}
							})
						}
					});
				}
			});
		}).on('click', '#add-folder', function() {
			$('#new-folder-form').modal('show');
		}).on('click', '.add-document', function() {
			module.new_doc_folder_id = this.getAttribute('data-folder-id');
			$('#new-doc-form').modal('show');
			initForms();
		}).on('click', '.edit-folder', function() {
			module.edit_folder_id = this.getAttribute('data-folder-id');
			var name = $(this).parents('.folder.content').find('.folder-name').text();
			var description = $(this).parents('.folder.content').find('.folder-description').text();
			$('#edit-folder-form input[name="name"]').val(name);
			$('#edit-folder-form textarea').val(description);
			$('#edit-folder-form').modal('show');
		}).on('click', '.edit-doc', function() {
			module.edit_doc_id = this.getAttribute('data-doc-id');
			var title = $(this).parents('.doc.content').find('.open-doc').text();
			var description = $(this).parents('.doc.content').find('.description').text();
			$('#edit-doc-form input[name="title"]').val(title);
			$('#edit-doc-form textarea').val(description);
			$('#edit-doc-form').modal('show');
		}).on('click', '.delete-item', function() {
			var type = this.getAttribute('data-type');
			var id = this.getAttribute('data-id');
			var confirm = window.confirm("Are you sure?");
			if (confirm) {
				$.ajax({
					url: '/api_dashboard/document/',
					type: 'post',
					data: {
						'action': 'delete-item',
						'item_type': type,
						'item_id': id
					},
					success: function(xhr) {
						updateCategories();
						if (type == 'docsection') {
							$('#doc-categories .open-doc[data-id="' + module.currentDocId + '"]').trigger('click');
						}
					}
				});
			}
		});
		updateCategories({
			'full_page': true
		});
	};
	function updateCategories(options) {
		var options = options || {};
		return $.ajax({
			url: '/api_dashboard/document/',
			type: 'post',
			data: {
				'action': 'get-categories'
			},
			success: function(xhr) {
				if (options.full_page) {
					module.$el.html(xhr.html);
					initEditor();
					initForms();
				} else {
					module.$el.find('#doc-categories').html($(xhr.html).filter('#doc-categories').children());
				}
			},
			error: function(xhr) {

			}
		});
	}
	function initEditor() {
		CKEDITOR.replace('newdocsection', {
			// allow vertical resizing
			resize_enabled: true,
			resize_dir: 'vertical',

			// transform blank lines into empty <p> tags
			fillEmptyBlocks: false,

			// don't encode chars other than & < > and &nbsp;
			entities: false,

			// knowntags except div and span with attributes (except tyle and class) will be kept
			pasteFilter: 'semantic-content',

			// toolbar
			toolbar: [
				{name: 'document', items: ['Source']},
				{name: 'basicstyles', items: ['Bold', 'Italic', 'RemoveFormat']},
				{name: 'paragraph', items: ['NumberedList', 'BulletedList']},
				{name: 'links', items: ['Link', 'Unlink']},
				{name: 'insert', items: ['Image']}
			],

		});
		//module.focusManager = new CKEDITOR.focusManager('newdoc');
	}
	function initForms() {
		$('#new-folder-form form').form({
			fields: {
				name: {
					identifier: 'name',
					rules: [{
						type: 'empty',
						prompt: 'Please enter the folder name'
					}]
				}
			},
			onSuccess: function(e) {
				e.preventDefault();
				$('#new-folder-form').modal('hide');
				$.ajax({
					url: '/api_dashboard/document/',
					data: $.extend({
						'action': 'new-folder'
					}, $('#new-folder-form form').form('get values')),
					type: 'post',
					success: function(xhr) {
						updateCategories();
					}
				});
			}
		});
		$('#edit-folder-form form').form({
			fields: {
				name: {
					identifier: 'name',
					rules: [{
						type: 'empty',
						prompt: 'Please enter the folder name'
					}]
				}
			},
			onSuccess: function(e) {
				e.preventDefault();
				$('#edit-folder-form').modal('hide');
				$.ajax({
					url: '/api_dashboard/document/',
					type: 'post',
					data: $.extend({
						'action': 'edit-folder',
						folder_id: module.edit_folder_id,
					}, $('#edit-folder-form form').form('get values')),
					success: function(xhr) {
						updateCategories();
					}
				});
			}
		});
		$('#new-doc-form form').form({
			fields: {
				title: {
					identifier: 'title',
					rules: [{
						type: 'empty',
						prompt: 'Please enter the document title'
					}]
				}
			},
			onSuccess: function(e) {
				e.preventDefault();
				$('#new-doc-form').modal('hide');
				$.ajax({
					url: '/api_dashboard/document/',
					data: $.extend({
						'action': 'new-doc',
						'folder_id': module.new_doc_folder_id
					}, $('#new-doc-form form').form('get values')),
					type: 'post',
					success: function(xhr) {
						updateCategories();
					}
				});
			}
		});
		$('#edit-doc-form form').form({
			fields: {
				title: {
					identifier: 'name',
					rules: [{
						type: 'empty',
						prompt: 'Please enter the folder name'
					}]
				}
			},
			onSuccess: function(e) {
				e.preventDefault();
				$('#edit-doc-form').modal('hide');
				$.ajax({
					url: '/api_dashboard/document/',
					type: 'post',
					data: $.extend({
						'action': 'edit-doc',
						doc_id: module.edit_doc_id,
					}, $('#edit-doc-form form').form('get values')),
					success: function(xhr) {
						updateCategories();
					}
				});
			}
		});
		$('.new-docsection.segment form').form({
			onSuccess: function(e) {
				e.preventDefault();
				var content = CKEDITOR.instances.newdocsection.getData();
				content = content.replace('&nbsp;', ' ');
				$.ajax({
					url: '/api_dashboard/document/',
					type: 'post',
					data: $.extend({
						'action': 'new-docsection',
						'doc_id': module.currentDocId,
						'content': content
					}, $('.new-docsection.segment form').form('get values')),
					success: function(xhr) {
						updateCategories()
							.done(function() {
								// update #doc-content pane
								$('#doc-categories .open-doc[data-id="' + module.currentDocId + '"]').trigger('click');
							});
					}
				});
			}
		})
	}
	return module;
});