export function getInboxLink(email?: string | null) {
  const normalized = email?.trim().toLowerCase() ?? ''
  const domain = normalized.split('@')[1] ?? ''

  if (domain.includes('gmail.com') || domain.includes('googlemail.com')) {
    return 'https://mail.google.com/mail/u/0/#inbox'
  }

  if (
    domain.includes('outlook.com') ||
    domain.includes('hotmail.com') ||
    domain.includes('live.com') ||
    domain.includes('msn.com')
  ) {
    return 'https://outlook.live.com/mail/0/'
  }

  if (domain.includes('icloud.com') || domain.includes('me.com') || domain.includes('mac.com')) {
    return 'https://www.icloud.com/mail'
  }

  if (domain.includes('yahoo.com')) {
    return 'https://mail.yahoo.com/'
  }

  return 'mailto:'
}
