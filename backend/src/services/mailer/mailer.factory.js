module.exports = {
  HtmlMailFactory: function(
    to = '',
    subject = '',
    html = '',
    attachments = [],
    from,
    replyTo = '',
    cc = '',
  ) {
    return {
      ...(from ? { from } : undefined),
      to: to,
      bcc: '',
      subject: subject,
      html: html,
      attachments: attachments,
      replyTo: replyTo,
      cc: cc,
    };
  },
};
