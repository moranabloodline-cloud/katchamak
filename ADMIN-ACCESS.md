# Admin access and invitation emails

Accounts and access includes registered accounts, assigned licenses and the Sites
invitation roster imported through the secret runtime variable
`KATCHAMAK_INVITED_USERS` (`[{"email":"…","name":"…"}]`). It is a snapshot of
the Site's allowed users, updated when Sites sharing is reconciled during maintenance;
the application cannot read changes to Sites sharing by itself. Keep this roster
out of source control. Import only existing Site invitees, without assigning licenses.

Suspension is stored by email in `account_access` and checked by every authenticated
account/library request, including first sign-in. Reimporting invitations does not
reset suspended status. Restore re-enables account access without modifying projects.
Platform Site sharing remains a separate outer gate; new recipients must also be
allowed by the Site's sharing settings.

## Send access link

In Sites runtime environment settings add:

- `RESEND_API_KEY` as a secret, with permission to send mail.
- `KATCHAMAK_MAIL_FROM`: a sender on a domain verified in Resend, for example
  `Katchamak <hello@your-domain.example>`.

Publish a saved version after changing environment variables. Do not put API keys
in this repository, local public assets, or `NEXT_PUBLIC_*` variables.

The Admin license row's **Send access link** button uses an authenticated same-origin
POST. It requires an active license and a non-suspended recipient. The email links
to `/#library`; the recipient signs in with their own ChatGPT account and receives
only their private library. The link is not an authentication token.

Resend acceptance is shown as acceptance for sending, not confirmed delivery. Missing
configuration or a provider failure returns an error. The same request id is reused
on an uncertain retry; the Resend idempotency header protects against duplicates.
No message is sent during page rendering, builds, tests, or publication.

References: https://resend.com/docs/api-reference/emails/send-email and
https://resend.com/docs/dashboard/emails/idempotency-keys.


## Gmail sender

KATCHAMAK_GMAIL_CLIENT_ID, KATCHAMAK_GMAIL_CLIENT_SECRET and KATCHAMAK_GMAIL_SENDER are server-only Sites secrets. Admin uses Connect Gmail once, granting only gmail.send and basic email identity. The callback is /api/admin/gmail/callback at the deployed Site origin. Only the configured sender email is accepted. OAuth state is one-use, bound to the admin ID, expires after ten minutes and uses PKCE. Refresh tokens are AES-GCM encrypted in admin_mail_connection, never library exports. Do not rotate the client secret without reconnecting Gmail.

Gmail send requests are deduplicated by request ID; a timeout or provider 5xx must be checked in Gmail Sent before another send. Accepted sends retain provider message IDs. Google Testing-mode refresh tokens expire after seven days; publishing/verification is a separate Google setup step. This setup does not change Sites sharing: a recipient must also have Site access to pass its outer sign-in gate.
