export function redirectToFrontend(res: any, frontendBaseUrl: string): void {
  const redirectUrl = `${frontendBaseUrl}/admin/content/omini_channels`;
  res.redirect(redirectUrl);
}

export function redirectToErrorPage(
  res: any,
  frontendBaseUrl: string,
  logId: string
): void {
  const redirectUrl = logId
    ? `${frontendBaseUrl}/admin/content/integration_logs${logId}`
    : `${frontendBaseUrl}/admin/content/integration_logs`;
  res.redirect(redirectUrl);
}
