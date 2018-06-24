define([
	'jquery',
	'utils',
	'semantic-ui'
], function(
	$,
	Utils
) {
	var module = {
		initHeader: function() {
			// set session storage
			sessionStorage.clear();
			$('.top.menu .ui.dropdown').dropdown();
			if ($('#header-visitor-wrapper').length) { // not logged in
				sessionStorage.setItem('user_id', '-1');
				initVisitorBtns();
			} else {
				sessionStorage.setItem('user_id', $('#header-user-name').attr('data-id'));
				sessionStorage.setItem('user_name', $('#header-user-name').text());
				require(['message']);
				initUserBtns();
				// check if within a specific forum
				if ($('#header-user-name').attr('data-role')) {
					var role = $('#header-user-name').attr('data-role');
					sessionStorage.setItem('role', role);

					// check if facilitator
					if (role == 'facilitator' || role == 'admin') {
						initFacilitatorBtns();
					}
				}
			}

			$('#issue-desc-btn').popup({
				position : 'bottom left',
			});

			$('.pin-message .close')
			  .on('click', function() {
			    $(this)
			      .closest('.message')
			      .transition('fade')
			    ;
			  })
			;
		}
	};

	function initFacilitatorBtns() {
		// populate users list
		$.ajax({
			url: '/api_dashboard/user_mgmt/',
			type: 'post',
			data: {
				'action': 'get_user_list'
			},
			success: function(xhr) {
				$('#user-switch-menu .switch.user.menu').html(xhr.html);
			},
			error: function(xhr) {
				if (xhr.status == 403) {
					Utils.notify('error', xhr.responseText);
				}
			}
		});
		$('#user-switch-menu .switch.user.menu').on('click', ' .item', function() {
			var user_id = this.getAttribute('data-id');
			var user_name = $(this).text();
			$.ajax({
				url: '/api_register_delegator/',
				type: 'post',
				data: {
					user_id: user_id,
				},
				success: function(xhr) {
					if (user_name.indexOf(sessionStorage['user_name']) > -1) {
						// switched back!
						$('#header-user-name').text(user_name);
						delete sessionStorage['simulated_user_name'];
						delete sessionStorage['simulated_user_id'];
						delete sessionStorage['simulated_user_role'];
					} else {
						$('#header-user-name').text(user_name + ' (simulated)');
						sessionStorage['simulated_user_name'] = user_name;
						sessionStorage['simulated_user_id'] = user_id;
						sessionStorage['simulated_user_role'] = xhr.role;
					}
					if (require.defined('phase3/claim')) {
						require('phase3/claim').updateClaimPane();
					} else if (require.defined('phase4/claim') && require('phase4/claim').slot_id) {
						require('phase4/claim').updateClaimPane();
					}
				},
				error: function(xhr) {
					if (xhr.status == 403) {
						Utils.notify('error', xhr.responseText);
					}
				}
			});
		});
	}
	function initUserBtns() {
		$('#sign-out-btn').click(function() {
			$.ajax({
				url: '/api_logout/',
				type: 'post',
				complete: function() {
					window.location.reload();
				}
			});
		});
		$('#edit-profile-btn').click(function() {
			var $form_dlg = $('#edit-profile-form');
			var $form_profile = $form_dlg.find('.ui.form').first();
			var $form_password = $form_dlg.find('.ui.form').last();
			$.ajax({
				url: '/api_change_info/',
				type: 'post',
				data: {
					action: 'get'
				},
				success: function(xhr) {
					$form_profile.find('input[name="first-name"]').val(xhr.first_name);
					$form_profile.find('input[name="last-name"]').val(xhr.last_name);
					$form_profile.find('textarea[name="description"]').val(xhr.description);
					$form_profile.find('#email-field').text(xhr.email);
				},
				error: function(xhr) {
					$form_dlg.find('.error.message').text(xhr.responseText);
					$form_dlg.find('.ui.form').addClass('error');
				}
			});
			$form_dlg.find('.menu .item').tab();
			$form_dlg.modal('show');
			$form_profile.form({
				fields: {
					first_name: {
						identifier: 'first-name',
						rules: [{
							type: 'empty',
							prompt: 'Please enter your first name'
						}]
					},
					last_name: {
						identifier: 'last-name',
						rules: [{
							type: 'empty',
							prompt: 'Please enter your last name'
						}]
					}
				},
				onSuccess: function(e) {
					e.preventDefault();
					$('.edit-profile-submit-btn').addClass('loading');
					$.ajax({
						url: '/api_change_info/',
						data: $.extend({
							action: 'set-info'
						}, $form_profile.form('get values')),
						type: 'post',
						success: function(xhr) {
							sessionStorage.setItem('user_name', xhr.user_name);
							$('#header-user-name').text(xhr.user_name);
							$form_dlg.modal('hide');
							$('.edit-profile-submit-btn').removeClass('loading');
						},
						error: function(xhr) {
							$form_profile.find('.error.message').text(xhr.responseText);
							$form_profile.addClass('error');
							$('.edit-profile-submit-btn').removeClass('loading');
						}
					});
				}
			});
			$form_password.form({
				fields: {
					old_password: {
						identifier: 'old_password',
						rules: [{
							type: 'empty',
							prompt: 'Please enter a password'
						}]
					},
					new_password: {
						identifier: 'new_password',
						rules: [{
							type: 'empty',
							prompt: 'Please enter a password'
						}, {
							type: 'length[6]',
							prompt: 'Your password must be at least 6 characters'
						}, {
							type: 'match[confirm_password]',
							prompt: 'Password and confirmation should be equal'
						}]
					}
				},
				onSuccess: function(e) {
					e.preventDefault();
					$('.edit-profile-submit-btn').addClass('loading');
					$.ajax({
						url: '/api_change_info/',
						data: $.extend({
							action: 'set-pw'
						}, $form_password.form('get values')),
						type: 'post',
						success: function(xhr) {
							$form_dlg.modal('hide');
							$('.edit-profile-submit-btn').removeClass('loading');
						},
						error: function(xhr) {
							$form_password.find('.error.message').text(xhr.responseText);
							$form_password.addClass('error');
							$('.edit-profile-submit-btn').removeClass('loading');
						}
					});
				}
			});
		});
		$('#show-messages').click(function() {
			$('#messages-modal').modal('show');
			require('message').updateMessageList();
		});
	}
	function initVisitorBtns() {
		$('#login-btn').click(function() {
			$('#sign-in-form').modal('show');
		});
		$('#signup-btn').click(function() {
			$('#sign-up-form').modal('show');
		});

		$('#sign-in-form form').form({
			fields: {
				email: {
					identifier: 'email',
					rules: [{
						type: 'email',
						prompt: 'Please enter a valid email address'
					}]
				},
				password: {
					identifier: 'password',
					rules: [{
						type: 'empty',
						prompt: 'Please enter a password'
					}]
				}
			},
			onSuccess: function(e) {
				e.preventDefault();
				$('#sign-in-btn').addClass('loading');
				var $form = $('#sign-in-form form');
				$.ajax({
					url: '/api_login/',
					data: $form.form('get values'),
					type: 'post',
					success: function(xhr) {
						window.location.reload();
					},
					error: function(xhr) {
						$form.find('.error.message').text(xhr.responseText);
						$form.addClass('error');
						$('#sign-in-btn').removeClass('loading');
					}
				});
			}
		});
		$('#sign-up-form form').form({
			fields: {
				first_name: {
					identifier: 'first-name',
					rules: [{
						type: 'empty',
						prompt: 'Please enter your first name'
					}]
				},
				last_name: {
					identifier: 'last-name',
					rules: [{
						type: 'empty',
						prompt: 'Please enter your last name'
					}]
				},
				email: {
					identifier: 'email',
					rules: [{
						type: 'email',
						prompt: 'Please enter a valid email address'
					}]
				},
				password: {
					identifier: 'password',
					rules: [{
						type: 'empty',
						prompt: 'Please enter a password'
					}, {
						type: 'length[6]',
						prompt: 'Your password must be at least 6 characters'
					}]
				}
			},
			onSuccess: function(e) {
				e.preventDefault();
				$('#register-btn').addClass('loading');
				var $form = $('#sign-up-form form');
				$.ajax({
					url: '/api_register/',
					data: $form.form('get values'),
					type: 'post',
					success: function(xhr) {
						window.location.reload();
					},
					error: function(xhr) {
						$form.find('.error.message').text(xhr.responseText);
						$form.addClass('error');
						$('#register-btn').removeClass('loading');
					}
				});
			}
		});
	}
	return module;
});

