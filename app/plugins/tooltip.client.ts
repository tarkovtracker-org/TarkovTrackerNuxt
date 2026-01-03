import {
  autoUpdate,
  computePosition,
  flip,
  offset,
  shift,
  arrow,
  type ComputePositionConfig,
  type Placement,
} from '@floating-ui/dom';
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.directive('tooltip', {
    mounted(el, binding) {
      createTooltip(el, binding.value);
    },
    updated(el, binding) {
      if (binding.value !== binding.oldValue) {
        updateTooltipContent(el, binding.value);
      }
    },
    unmounted(el) {
      destroyTooltip(el);
    },
  });
});
interface TooltipOptions {
  content: string;
  placement?: Placement;
  html?: boolean;
}
// Store tooltip instance on element for cleanup/updates
const tooltipMap = new WeakMap<
  HTMLElement,
  {
    tooltip: HTMLElement;
    cleanup: () => void;
    arrowElement: HTMLElement;
    show: () => void;
    hide: () => void;
  }
>();
function createTooltip(el: HTMLElement, value: string | TooltipOptions) {
  if (!value) return;
  const options: TooltipOptions =
    typeof value === 'string' ? { content: value } : value;
  // Create tooltip element
  const tooltip = document.createElement('div');
  tooltip.className =
    'fixed z-[9999] hidden max-w-xs rounded bg-gray-900 px-2 py-1 text-xs text-white shadow-lg dark:bg-surface-800 dark:text-gray-200 pointer-events-none transition-opacity duration-200 opacity-0';
  // Arrow element
  const arrowElement = document.createElement('div');
  arrowElement.className = 'absolute h-2 w-2 rotate-45 bg-gray-900 dark:bg-surface-800';
  tooltip.appendChild(arrowElement);
  const contentDiv = document.createElement('div');
  contentDiv.className = 'relative z-10'; // Above arrow
  tooltip.appendChild(contentDiv);
  // Set initial content
  if (options.html) {
    contentDiv.innerHTML = options.content;
  } else {
    contentDiv.textContent = options.content;
  }
  document.body.appendChild(tooltip);
  let cleanup: (() => void) | null = null;
  let rafId: number | null = null;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const updatePosition = () => {
    const placement = options.placement || 'top';
    const config: ComputePositionConfig = {
      placement,
      strategy: 'fixed',
      middleware: [
        offset(6),
        flip(),
        shift({ padding: 5 }),
        arrow({ element: arrowElement }),
      ],
    };
    computePosition(el, tooltip, config).then(({ x, y, placement, middlewareData }) => {
      Object.assign(tooltip.style, {
        left: `${x}px`,
        top: `${y}px`,
      });
      // Position arrow
      const { x: arrowX, y: arrowY } = middlewareData.arrow || {};
      const staticSide = {
        top: 'bottom',
        right: 'left',
        bottom: 'top',
        left: 'right',
      }[placement.split('-')[0] as 'top' | 'right' | 'bottom' | 'left']!;
      Object.assign(arrowElement.style, {
        left: arrowX != null ? `${arrowX}px` : '',
        top: arrowY != null ? `${arrowY}px` : '',
        right: '',
        bottom: '',
        [staticSide]: '-4px', // Half size of arrow
      });
    });
  };
  const show = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    tooltip.style.display = 'block';
    // Ensure we don't have duplicate autoUpdate loops
    if (cleanup) {
      cleanup();
    }
    cleanup = autoUpdate(el, tooltip, updatePosition);
    // Small delay to allow display block to render before opacity transition
    rafId = requestAnimationFrame(() => {
        tooltip.style.opacity = '1';
        rafId = null;
    });
  };
  const hide = () => {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    tooltip.style.opacity = '0';
    // Wait for transition
    timeoutId = setTimeout(() => {
        tooltip.style.display = 'none';
        if (cleanup) {
            cleanup();
            cleanup = null;
        }
        timeoutId = null;
    }, 200);
  };
  // Event listeners
  el.addEventListener('mouseenter', show);
  el.addEventListener('mouseleave', hide);
  el.addEventListener('focus', show);
  el.addEventListener('blur', hide);
  tooltipMap.set(el, { tooltip, cleanup: () => {
     if (cleanup) cleanup();
     el.removeEventListener('mouseenter', show);
     el.removeEventListener('mouseleave', hide);
     el.removeEventListener('focus', show);
     el.removeEventListener('blur', hide);
     tooltip.remove();
  }, arrowElement, show, hide });
}
function updateTooltipContent(el: HTMLElement, value: string | TooltipOptions) {
  const instance = tooltipMap.get(el);
  if (!instance) {
    // If it didn't exist (e.g. initially null/undefined), create it
    if (value) createTooltip(el, value);
    return;
  }
  if (!value) {
    destroyTooltip(el);
    return;
  }
  const options: TooltipOptions =
    typeof value === 'string' ? { content: value } : value;
  const contentDiv = instance.tooltip.lastElementChild as HTMLElement; // Content is last child
  if (options.html) {
    contentDiv.innerHTML = options.content;
  } else {
    contentDiv.textContent = options.content;
  }
}
function destroyTooltip(el: HTMLElement) {
  const instance = tooltipMap.get(el);
  if (instance) {
    instance.cleanup();
    tooltipMap.delete(el);
  }
}
