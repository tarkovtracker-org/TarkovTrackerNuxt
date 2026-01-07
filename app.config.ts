// @ts-expect-error - defineAppConfig is auto-imported by Nuxt
export default defineAppConfig({
  ui: {
    // ✅ Nuxt UI v4: Map semantic color names to palette names defined in @theme (tailwind.css)
    colors: {
      primary: 'primary', // brand tan
      secondary: 'secondary', // brand dark
      neutral: 'surface', // dark grays for neutral UI elements
      // Game mode colors - map to in-game color palettes
      pvp: 'pvp', // in-game PvP tan (#DBD5C1)
      pve: 'pve', // in-game PvE blue (#73ADC3)
      // Semantic colors - map to Tailwind's default palettes or custom ones
      info: 'accent',
      success: 'success',
      warning: 'warning',
      error: 'error',
    },
    header: {
      slots: {
        root: 'fixed top-0 inset-x-0 z-50 backdrop-blur-sm bg-gradient-to-tr from-surface-800/95 to-surface-950/95 border-b border-surface-700/70 h-[var(--ui-header-height)]',
        container: 'h-full px-3 flex items-center gap-3',
        left: 'flex items-center gap-2',
        default: 'flex-1 min-w-0',
        right: 'ml-auto flex items-center gap-2',
      },
    },
    // Popover configuration to ensure proper display above other content
    popover: {
      popper: {
        strategy: 'fixed',
      },
      slots: {
        content: 'z-[9999]',
      },
    },
    // USelect specific configuration
    select: {
      popper: {
        strategy: 'fixed',
        placement: 'bottom-start',
      },
      slots: {
        base: 'relative w-full',
        input:
          'h-11 bg-surface-900 border border-white/15 text-surface-50 placeholder:text-surface-500 rounded-md pl-10 pr-3 py-2 focus:ring-2 focus:ring-accent-500 focus:border-white/20',
        leading: 'absolute inset-y-0 left-3 flex items-center pointer-events-none text-surface-300',
        options: 'z-[9999] max-h-60 overflow-auto',
      },
    },
    // SelectMenu configuration
    selectMenu: {
      popper: {
        strategy: 'fixed',
        placement: 'bottom-start',
      },
      slots: {
        base: 'bg-surface-900 border border-surface-700 rounded-lg shadow-xl overflow-hidden z-[9999]',
        list: 'py-1',
        option: {
          base: 'px-3 py-2 text-sm cursor-pointer transition-colors',
          inactive: 'text-surface-300 hover:bg-surface-800 hover:text-white',
          active: 'bg-surface-800 text-white',
          selected: 'bg-surface-700 text-white font-semibold',
        },
        empty: 'px-3 py-2 text-sm text-surface-500 text-center',
      },
    },
    // Modal configuration with proper z-index stacking
    modal: {
      slots: {
        // Overlay must be above all content (z-50)
        overlay: 'fixed inset-0 z-[60] bg-surface-900/75 backdrop-blur-sm',
        // Container for centering and scrolling
        container: 'fixed inset-0 z-[60] overflow-y-auto flex items-start justify-center p-4',
        // Actual modal content wrapper
        wrapper: 'relative w-full max-w-md',
      },
    },
    // Button configuration for custom colors
    button: {
      variants: {
        color: {
          pvp: {
            solid: 'bg-pvp-500 hover:bg-pvp-600 text-white',
            outline: 'ring ring-inset ring-pvp-500 text-pvp-400 hover:bg-pvp-950',
            soft: 'bg-pvp-900 hover:bg-pvp-800 text-pvp-200',
            ghost: 'text-pvp-400 hover:bg-pvp-900',
            link: 'text-pvp-400 hover:text-pvp-300 underline-offset-4 hover:underline',
          },
          pve: {
            solid: 'bg-pve-500 hover:bg-pve-600 text-white',
            outline: 'ring ring-inset ring-pve-500 text-pve-400 hover:bg-pve-950',
            soft: 'bg-pve-900 hover:bg-pve-800 text-pve-200',
            ghost: 'text-pve-400 hover:bg-pve-900',
            link: 'text-pve-400 hover:text-pve-300 underline-offset-4 hover:underline',
          },
          success: {
            solid: 'bg-success-500 hover:bg-success-600 active:bg-success-700 text-white',
            outline:
              'ring ring-inset ring-success-500 text-success-500 hover:bg-success-950 hover:text-white',
            soft: 'bg-success-950 hover:bg-success-900 text-success-200',
            ghost: 'text-success-500 hover:bg-success-950',
            link: 'text-success-500 hover:text-success-400 underline-offset-4 hover:underline',
          },
        },
      },
    },
    // Input configuration to enforce theme-driven text color
    input: {
      slots: {
        base: 'relative block w-full focus:outline-none border-0 text-accent-700 dark:text-accent-200 placeholder:text-gray-500 dark:placeholder:text-gray-400 bg-transparent',
      },
    },
  },
});
