import React from 'react'
import Button from '../ui/Button'
import { Heading, Text } from '../ui/Typography'

const Footer = () => {
  return (
    <footer className="relative z-10 mt-16 bg-black px-4 py-16 text-center text-white">
      <div className="mx-auto mb-16 max-w-2xl">
        <Heading variant="heading-l" className="mb-2 text-white">
          Join the email list
        </Heading>
        <Text variant="body-base" className="mb-6 text-gray-400">
          Get updates
        </Text>
        <form className="mx-auto flex max-w-md gap-2" onSubmit={(e) => e.preventDefault()}>
          <input
            type="email"
            placeholder="email address"
            className="focus:border-mustard flex-1 border-2 border-transparent bg-white px-4 py-3 font-body font-bold text-black focus:outline-none"
          />
          <Button type="submit" intent="secondary">
            Submit
          </Button>
        </form>
      </div>

      <div className="mb-12">
        <Text variant="body-s" className="mx-auto max-w-lg leading-relaxed text-gray-500">
          Built with AI assistance. Writing, code, and design refined through testing and iteration.
          <a
            href="https://emilioharrison.com/fieldnotes/my-writing-process-explained"
            className="mt-2 block text-gray-400 underline decoration-gray-700 underline-offset-4 transition-all hover:text-white hover:decoration-white"
          >
            Curious about my process? →
          </a>
        </Text>
      </div>

      <div className="font-bold text-gray-600">
        <Text variant="fine">© 2025 Emilio Harrison</Text>
      </div>
    </footer>
  )
}

export default Footer
