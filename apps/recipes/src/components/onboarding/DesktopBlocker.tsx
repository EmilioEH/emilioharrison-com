import React from 'react'

export const DesktopBlocker: React.FC = () => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background p-6 text-center text-foreground">
      <div className="max-w-md space-y-6">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <svg
            className="h-10 w-10 text-primary"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold">Please Use Your Phone</h1>
        <p className="text-muted-foreground">
          The Recipe App is designed as a mobile-first experience. For the best cooking experience,
          please open this link on your smartphone.
        </p>
      </div>
    </div>
  )
}
