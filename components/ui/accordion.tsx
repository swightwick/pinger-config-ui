"use client"

import * as React from "react"
import * as AccordionPrimitive from "@radix-ui/react-accordion"
import { ChevronDown } from "lucide-react"
import { gsap } from "gsap"

import { cn } from "@/lib/utils"

const Accordion = AccordionPrimitive.Root

const AccordionItem = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>
>(({ className, ...props }, ref) => (
  <AccordionPrimitive.Item
    ref={ref}
    className={cn("border-b", className)}
    {...props}
  />
))
AccordionItem.displayName = "AccordionItem"

const AccordionTrigger = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Header className="flex">
    <AccordionPrimitive.Trigger
      ref={ref}
      className={cn(
        "flex flex-1 items-center justify-between py-4 text-sm font-medium transition-all hover:underline text-left [&[data-state=open]>svg]:rotate-180",
        className
      )}
      {...props}
    >
      {children}
      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200" />
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
))
AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName

const AccordionContent = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ className, children, ...props }, ref) => {
  const contentRef = React.useRef<HTMLDivElement>(null)
  const innerRef = React.useRef<HTMLDivElement>(null)
  const isAnimating = React.useRef(false)

  React.useEffect(() => {
    const content = contentRef.current
    const inner = innerRef.current
    if (!content || !inner) return

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-state') {
          const state = content.getAttribute('data-state')

          if (state === 'open' && !isAnimating.current) {
            isAnimating.current = true

            // Kill any existing animations
            gsap.killTweensOf([content, inner])

            // Set initial state
            gsap.set(content, { height: 0 })
            gsap.set(inner, { opacity: 0, y: -10 })

            // Animate open
            gsap.to(content, {
              height: 'auto',
              duration: 0.4,
              ease: 'power2.out',
              onComplete: () => {
                isAnimating.current = false
              }
            })
            gsap.to(inner, {
              opacity: 1,
              y: 0,
              duration: 0.3,
              delay: 0.1,
              ease: 'power2.out'
            })
          } else if (state === 'closed' && !isAnimating.current) {
            isAnimating.current = true

            // Kill any existing animations
            gsap.killTweensOf([content, inner])

            // Animate close
            gsap.to(inner, {
              opacity: 0,
              y: -10,
              duration: 0.25,
              ease: 'power2.in'
            })
            gsap.to(content, {
              height: 0,
              duration: 0.4,
              ease: 'power2.in',
              onComplete: () => {
                isAnimating.current = false
              }
            })
          }
        }
      })
    })

    observer.observe(content, { attributes: true })

    return () => observer.disconnect()
  }, [])

  return (
    <AccordionPrimitive.Content
      ref={(node) => {
        contentRef.current = node
        if (typeof ref === 'function') ref(node)
        else if (ref) ref.current = node
      }}
      className="overflow-hidden text-sm"
      forceMount
      {...props}
    >
      <div ref={innerRef} className={cn("pb-4 pt-0", className)}>{children}</div>
    </AccordionPrimitive.Content>
  )
})
AccordionContent.displayName = AccordionPrimitive.Content.displayName

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
