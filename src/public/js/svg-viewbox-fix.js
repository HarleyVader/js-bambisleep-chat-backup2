// SVG ViewBox Fix for Browser Extensions
// This script prevents invalid viewBox errors from external sources

(function() {
  'use strict';
  
  // Store original methods
  const originalCreateElementNS = document.createElementNS;
  const originalSetAttribute = Element.prototype.setAttribute;
  
  // Function to fix invalid viewBox values
  function fixViewBoxValue(value) {
    if (typeof value !== 'string') return value;
    
    // Check if it contains percentage values like "0 0 100% 2"
    if (value.includes('%')) {
      // Replace percentage with numeric values
      // Common pattern: "0 0 100% 2" should become "0 0 100 2"
      return value.replace(/(\d+)%/g, '$1');
    }
    
    return value;
  }
  
  // Override createElement for SVG elements
  document.createElementNS = function(namespaceURI, qualifiedName) {
    const element = originalCreateElementNS.call(this, namespaceURI, qualifiedName);
    
    if (namespaceURI === 'http://www.w3.org/2000/svg' && qualifiedName === 'svg') {
      // Override setAttribute for SVG elements
      const originalSVGSetAttribute = element.setAttribute;
      element.setAttribute = function(name, value) {
        if (name === 'viewBox') {
          value = fixViewBoxValue(value);
        }
        return originalSVGSetAttribute.call(this, name, value);
      };
    }
    
    return element;
  };
  
  // Override setAttribute globally to catch any missed cases
  Element.prototype.setAttribute = function(name, value) {
    if (name === 'viewBox' && this.tagName && this.tagName.toLowerCase() === 'svg') {
      value = fixViewBoxValue(value);
    }
    return originalSetAttribute.call(this, name, value);
  };
  
  // Also monitor for dynamically added elements with invalid viewBox
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(function(node) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Check if it's an SVG element with viewBox
            if (node.tagName && node.tagName.toLowerCase() === 'svg') {
              const viewBox = node.getAttribute('viewBox');
              if (viewBox && viewBox.includes('%')) {
                node.setAttribute('viewBox', fixViewBoxValue(viewBox));
              }
            }
            
            // Also check children
            const svgElements = node.querySelectorAll ? node.querySelectorAll('svg[viewBox]') : [];
            svgElements.forEach(function(svg) {
              const viewBox = svg.getAttribute('viewBox');
              if (viewBox && viewBox.includes('%')) {
                svg.setAttribute('viewBox', fixViewBoxValue(viewBox));
              }
            });
          }
        });
      }
      
      // Check for attribute changes
      if (mutation.type === 'attributes' && mutation.attributeName === 'viewBox') {
        const target = mutation.target;
        if (target.tagName && target.tagName.toLowerCase() === 'svg') {
          const viewBox = target.getAttribute('viewBox');
          if (viewBox && viewBox.includes('%')) {
            target.setAttribute('viewBox', fixViewBoxValue(viewBox));
          }
        }
      }
    });
  });
  
  // Start observing
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['viewBox']
  });
  
  console.log('SVG ViewBox fix loaded - protecting against invalid viewBox values');
})();
