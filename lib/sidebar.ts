export type SidebarMode = 'dev_incomplete' | 'dev_complete' | 'production_full'

export function computeSidebarMode(
  stage: string,
  onboardingComplete: boolean
): SidebarMode {
  if (stage !== 'production') {
    return onboardingComplete ? 'dev_complete' : 'dev_incomplete'
  }
  // production_full covers both entregado_con_mantenimiento and the legacy entregado status.
  // entregado_sin_mantenimiento clients also have stage='production', but the middleware
  // redirects them to /completed before they reach any sidebar-rendering layout.
  return 'production_full'
}
