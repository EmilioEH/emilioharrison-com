import React from 'react'
import { Mail, BookOpen } from 'lucide-react'
import Button from '../../ui/Button'
import ContentBlock from '../../ui/ContentBlock'
import { Text, Label } from '../../ui/Typography'

const Hero = () => {
  return (
    <div className="animate-in fade-in relative z-10 mb-24 grid grid-cols-1 items-center gap-8 duration-700 md:grid-cols-12">
      <div className="space-y-8 md:col-span-7">
        <div className="inline-block -rotate-2 transform">
          <ContentBlock color="bg-white" padding="px-4 py-1" className="text-black" pin>
            <Label variant="eyebrow">UX RESEARCHER & CREATIVE TECHNOLOGIST</Label>
          </ContentBlock>
        </div>

        <ContentBlock className="max-w-lg rotate-1 transform" padding="p-6" color="bg-white" pin>
          <Text variant="body-xl" className="font-bold leading-relaxed text-black">
            Building AI tools for real problems, not hype. Puzzle-obsessed. I write about what I'm
            learning, what I'm stuck on, and what's worth building in the first place.
          </Text>
        </ContentBlock>
        <div className="flex flex-wrap gap-4 pt-4">
          <Button href="/fieldnotes">
            <BookOpen size={20} /> Read Field Notes
          </Button>
          <Button href="/contact">
            <Mail size={20} /> Contact
          </Button>
        </div>
      </div>

      {/* Decorative right side (optional, or keep empty/image) */}
      <div className="pointer-events-none relative hidden min-h-[400px] items-center justify-center md:col-span-5 md:flex">
        {/* Shapes or Image can go here. For now, keeping it clean as per prototype which focused on text/shapes in background */}
      </div>
    </div>
  )
}

export default Hero
