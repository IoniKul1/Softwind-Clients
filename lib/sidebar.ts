export type SidebarMode = 'dev_incomplete' | 'dev_complete' | 'production_full'

export function computeSidebarMode(
  stage: string,
  onboardingComplete: boolean
): SidebarMode {
  if (stage !== 'production') {
    return onboardingComplete ? 'dev_complete' : 'dev_incomplete'
  }
  return 'production_full'
}
