import { create } from 'zustand'

const initialState = {
  termsAccepted: false,
  user: null,
  accessToken: null,
  isAuthenticated: false,
  breadCrumbs: [],
  currentPage: '',
  taxonomySelected: null,
  applicationSelected: null,
  podSelected: null,
  taxonomyStatus: '',
  currentWindowWidth: 0,
  packageVersions: {
    '@platformatic/composer': '1.52.2',
    '@platformatic/db': '1.52.2',
    '@platformatic/runtime': '1.52.2',
    '@platformatic/service': '1.52.2'
  },
  enableSidebarFirstLevel: false,
  pods: [],
  podsLoaded: false,
  splashScreen: {
    show: false,
    title: '',
    content: '',
    type: 'success',
    timeout: 5000,
    onDismiss: () => {}
  },
  currentApplication: null
}

const useICCStore = create((set, get) => ({
  ...initialState,
  computed: {
    get getApplicationSelectedServices () {
      const services = get().applicationSelected?.state?.services ?? []
      if (services.length === 0) { return services }
      return services.filter(service => service.entrypoint).concat(services.filter(service => !service.entrypoint))
    }
  },
  setSectionSelected: (sectionSelected) => set((state) => {
    return { ...state, sectionSelected }
  }),
  setOrganizationSelected: (organization) => set((state) => {
    return { ...state, organizationSelected: organization }
  }),
  setOrganizations: (data = []) => {
    set((state) => {
      return {
        ...state,
        organizations: [...data]
      }
    })
  },
  setProfile: (profile) => set((state) => {
    return { ...state, profile }
  }),
  setUser: (user) => set((state) => {
    return { ...state, user }
  }),
  setIsAuthenticated: (isAuthenticated) => set((state) => {
    return { ...state, isAuthenticated }
  }),
  setPackageVersions: function (packageVersions) {
    set((state) => {
      return { ...state, packageVersions }
    })
  },
  setTermsAccepted: (data) => {
    set((state) => {
      return {
        ...state,
        termsAccepted: data
      }
    })
  },
  setFullNavigation (items) {
    set((state) => {
      return {
        ...state,
        breadCrumbs: items
      }
    })
  },
  setNavigation: (item, level = 0) => {
    set((state) => {
      const currentBreadcrumbs = state.breadCrumbs.slice(0, level)
      currentBreadcrumbs.push(item)
      return {
        ...state,
        breadCrumbs: currentBreadcrumbs
      }
    })
  },
  popNavigation: () => {
    set((state) => {
      const currentBreadcrumbs = state.breadCrumbs.slice(0, state.breadCrumbs.length - 1)

      return {
        ...state,
        breadCrumbs: currentBreadcrumbs
      }
    })
  },
  resetNavigation: () => {
    set((state) => {
      return {
        ...state,
        breadCrumbs: []
      }
    })
  },
  setCurrentPage: (page) => {
    set((state) => {
      return {
        ...state,
        currentPage: page
      }
    })
  },
  setCurrentWindowWidth: (width) => {
    set((state) => {
      return {
        ...state,
        currentWindowWidth: width
      }
    })
  },
  setApplicationSelected: (applicationSelected) => {
    set((state) => {
      return {
        ...state,
        applicationSelected
      }
    })
  },
  setPodSelected: (podSelected) => {
    set((state) => {
      return {
        ...state,
        podSelected
      }
    })
  },
  setTaxonomySelected: (taxonomySelected) => {
    set((state) => {
      return {
        ...state,
        taxonomySelected
      }
    })
  },
  setTaxonomyStatus: (taxonomyStatus) => {
    set((state) => {
      return {
        ...state,
        taxonomyStatus
      }
    })
  },
  setEnableSidebarFirstLevel: (value) => {
    set((state) => {
      return {
        ...state,
        enableSidebarFirstLevel: value
      }
    })
  },
  setPods: (data = []) => {
    set((state) => {
      return {
        ...state,
        pods: [...data]
      }
    })
  },
  setPodsLoaded: (value) => {
    set((state) => {
      return {
        ...state,
        podsLoaded: value
      }
    })
  },
  showSplashScreen: ({ title, content, type = 'success', timeout = 3000, onDismiss }) => {
    set((state) => ({
      ...state,
      splashScreen: {
        show: true,
        title,
        content,
        type,
        timeout,
        onDismiss
      }
    }))
  },
  hideSplashScreen: () => {
    set((state) => {
      return {
        ...state,
        splashScreen: {
          ...state.splashScreen,
          show: false
        }
      }
    })
  },
  setCurrentApplication: (application) => {
    set((state) => {
      return {
        ...state,
        currentApplication: application
      }
    })
  }
}))

export default useICCStore
