"use strict";
const { getStyles } = require("../template.styles");

function inviteUserTemplate(data) {
  return `
    <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
    <html xmlns="http://www.w3.org/1999/xhtml">
      ${getStyles()}
      <body>
        <span class="preheader">Use this link to join the team.</span>
        <table class="email-wrapper" width="100%" cellpadding="0" cellspacing="0" role="presentation">
          <tr>
            <td align="center">
              <table class="email-content" width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td class="email-masthead">
                    <a href="https://www.mattermost-admin.com" class="email-masthead_name">
                    [${data.companyName}]
                  </a>
                  </td>
                </tr>
                <!-- Email Body -->
                <tr>
                  <td class="email-body" width="570" cellpadding="0" cellspacing="0">
                    <table class="email-body_inner" align="center" width="570" cellpadding="0" cellspacing="0" role="presentation">
                      <!-- Body content -->
                      <tr>
                        <td class="content-cell">
                          <div>
                            <h1>Hi,</h1>
                            <p>${data.inviterName} invite you to join the ${data.teamName} team. <strong>This link is only valid for the next 24 hours.</strong></p>
                            <!-- Action -->
                            <table class="body-action" align="center" width="100%" cellpadding="0" cellspacing="0" role="presentation">
                              <tr>
                                <td align="center">
                                  <table width="100%" border="0" cellspacing="0" cellpadding="0" role="presentation">
                                    <tr>
                                      <td align="center">
                                        <a href=${data.url}  class="button" target="_blank">Join the team</a>
                                      </td>
                                    </tr>
                                  </table>
                                </td>
                              </tr>
                            </table>
                            <p>If you did not create an account on mattermost, please do it <a href=${data.baseUrl}>here</a>.
                            You have to be logged in to join the team. </p>
                            <p>Thanks,
                              <br>The Admin team</p>
                            <!-- Sub copy -->
                            <table class="body-sub" role="presentation">
                              <tr>
                                <td>
                                  <p class="sub">If you’re having trouble with the button above, copy and paste the URL below into your web browser.</p>
                                  <p class="sub">${data.url}</p>
                                </td>
                              </tr>
                            </table>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td>
                    <table class="email-footer" align="center" width="570" cellpadding="0" cellspacing="0" role="presentation">
                    <tr>
                        <td class="content-cell" align="center">
                          <p class="sub align-center">
                            © 2025 Nocode. All rights reserved.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>`;
}

exports.template = inviteUserTemplate;
