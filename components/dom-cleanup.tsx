"use client"

import { useEffect } from 'react'

export function DOMCleanup() {
  useEffect(() => {
    const cleanupClasses = ['vsc-initialized']
    const cleanupAttributes = ['data-gr-ext-installed', 'data-new-gr-c-s-check-loaded']

    // Initial cleanup
    cleanupClasses.forEach(cls => document.body.classList.remove(cls))
    cleanupAttributes.forEach(attr => document.body.removeAttribute(attr))

    // Optional: Only set up observer if needed
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          cleanupClasses.forEach(cls => {
            if (document.body.classList.contains(cls)) {
              document.body.classList.remove(cls)
            }
          })
        }
      })
    })

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class']
    })

    return () => observer.disconnect()
  }, [])

  return null
}