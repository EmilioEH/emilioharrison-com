import React from 'react'
import { Briefcase, BookOpen, Award, Music, ArrowRight, Mail } from 'lucide-react'
import SectionTitle from '../../ui/SectionTitle'

import ContentBlock from '../../ui/ContentBlock'
import Button from '../../ui/Button'
import { Heading, Text, Label } from '../../ui/Typography'
import { useTheme } from '../../../hooks/useTheme'

const AboutContent = () => {
  const theme = useTheme()

  return (
    <div className="animate-in fade-in space-y-16 duration-700">
      <SectionTitle theme={theme}>About</SectionTitle>

      {/* Main Content - Story */}
      <div className="max-w-3xl">
        <ContentBlock color="bg-white" pin rotate={-1} padding="p-8" className="mb-8">
          <Text variant="body-xl" className="font-medium leading-relaxed">
            I got into UX research because I wanted to understand why people do confusing things
            with technology. Turns out, the technology is usually the confusing part.
          </Text>
        </ContentBlock>
        <div className="space-y-6 text-lg leading-relaxed text-gray-800">
          <Text variant="body-l">
            For years, that meant running usability tests, conducting interviews, and translating
            what people actually need into what product teams could build. Standard UX research
            work. Good work.
          </Text>
          <Text variant="body-l">
            Then LLMs showed up and everyone started calling them "game-changers" while
            simultaneously having no idea how to use them responsibly. I watched people ship AI
            features that looked impressive in demos and failed immediately in real use. I watched
            companies panic-adopt AI without asking if it solved actual problems.
          </Text>
          <Text variant="body-l">
            I also felt that panic myself. The "what if I'm obsolete" dread that comes with every
            new technology wave.
          </Text>
          <Text variant="body-l">
            So I did what I always do with confusing things: I started taking them apart to see how
            they work.
          </Text>
          <Text variant="body-l">
            I built my first LLM tool for heuristic evaluation at JP Morgan Chase. Then a thematic
            analysis assistant. Both got rolled out company-wide to UX professionals. Not because
            they were clever AI demos, but because I tested them until I knew they actually worked.
          </Text>
          <Text variant="body-l">
            That's when I realized: the skill isn't using AI. The skill is knowing when something's
            ready to ship and when you're just hoping it works.
          </Text>
          <Text variant="body-l" className="font-bold">
            Now I build AI tools for real problems, write about what I'm learning, and try to start
            conversations about what's actually worth building. I'm puzzle-obsessed,
            testing-obsessed, and probably more fun at dinner parties than this bio makes me sound.
          </Text>
        </div>
      </div>

      {/* What I Do */}
      <div>
        <Heading variant="heading-l" className="mb-8 inline-block border-b-4 border-black pb-2">
          What I Do
        </Heading>
        <ContentBlock color="bg-white" pin rotate={1} padding="p-8">
          <div className="mb-6 flex items-start gap-4">
            <Briefcase className="mt-1 text-black" size={32} />
            <div>
              <Heading variant="heading-m" className="mb-1">
                JP Morgan Chase
              </Heading>
              <Text variant="body-l" className="font-bold text-gray-700">
                UX Research Strategist, Operations Team
              </Text>
              <Text variant="fine" className="font-bold uppercase tracking-wider text-gray-500">
                January 2023 - Present | Austin, TX
              </Text>
            </div>
          </div>
          <div className="space-y-4 border-l-4 border-black pl-6 text-lg">
            <Text variant="body-l">
              I pioneered the firm's AI adoption strategy for UX research. That meant building
              specialized LLM tools for Thematic Analysis, Heuristic Evaluation, and Fraud
              Detection, then deploying them to UX professionals across the organization.
            </Text>
            <Text variant="body-l">
              The work isn't just building tools. It's proving they actually work before anyone uses
              them. I developed the 5×5 testing framework: 5 runs for consistency, 5 scenarios for
              accuracy. It's simple, but it's the difference between "this looks good" and "I know
              this works."
            </Text>
            <Text variant="body-l">
              I also led design system validation research—stakeholder interviews and 30+ hours of
              user testing that resulted in 50% faster task completion and measurably improved user
              confidence.
            </Text>
          </div>
        </ContentBlock>
      </div>

      {/* How I Work */}
      <div>
        <Heading variant="heading-l" className="mb-8 inline-block border-b-4 border-black pb-2">
          How I Work
        </Heading>
        <div className="grid grid-cols-1 gap-8">
          <ContentBlock color="bg-white" pin rotate={-1} padding="p-8">
            <Text variant="body-xl" className="mb-6 font-bold">
              I'm not interested in building AI tools that look impressive. I'm interested in
              building tools that actually solve problems.
            </Text>
            <Text variant="body-l" className="mb-6">
              That means asking "what job needs doing?" before writing any code. It means testing
              obsessively before shipping. It means admitting when something doesn't work instead of
              convincing myself it's "good enough."
            </Text>

            <div className="space-y-6">
              <ContentBlock padding="p-6" color="bg-white" pin rotate={1}>
                <Heading variant="heading-s" className="mb-2">
                  Context engineering over prompt engineering.
                </Heading>
                <Text variant="body-base">
                  You don't need the perfect prompt. You need the right information. I'd rather
                  spend 10 minutes finding good documentation than an hour trying to word a request
                  perfectly.
                </Text>
              </ContentBlock>

              <ContentBlock padding="p-6" color="bg-white" pin rotate={-1}>
                <Heading variant="heading-s" className="mb-2">
                  Test everything, trust nothing (at first).
                </Heading>
                <Text variant="body-base">
                  The 5×5 framework exists because I refuse to ship things based on hope. 5 runs to
                  check consistency. 5 scenarios to verify accuracy. Simple, repeatable, effective.
                </Text>
              </ContentBlock>

              <ContentBlock padding="p-6" color="bg-white" pin rotate={1}>
                <Heading variant="heading-s" className="mb-2">
                  Learn publicly, build openly.
                </Heading>
                <Text variant="body-base">
                  I write about what I'm stuck on, not just what I've figured out. The shift from
                  "wanting to be right" to "wanting to get it right" changed how I work. I'd rather
                  admit I don't know something than perform expertise I don't have.
                </Text>
              </ContentBlock>
            </div>

            <Text variant="body-l" className="mt-6 border-t-2 border-black pt-4 font-bold">
              The puzzle is the point. Solving it obsessively is just how I work.
            </Text>
          </ContentBlock>
        </div>
      </div>

      {/* Before This */}
      <div>
        <Heading variant="heading-l" className="mb-8 inline-block border-b-4 border-black pb-2">
          Before This
        </Heading>
        <div className="space-y-6">
          <ContentBlock color="bg-white" pin rotate={1} padding="p-6">
            <Heading variant="heading-m" className="mb-1">
              Charles Schwab
            </Heading>
            <Text variant="body-l" className="font-bold text-gray-700">
              Lead UX Researcher
            </Text>
            <Text variant="fine" className="mb-4 font-bold uppercase text-gray-500">
              2020-2022 | Austin, TX
            </Text>
            <Text variant="body-base">
              Led usability evaluations and content research that improved user understanding and
              accelerated content-first design. Identified friction points in client verification
              that resulted in a +90% fraud prevention rate and $26M quarterly cost avoidance.
            </Text>
          </ContentBlock>

          <ContentBlock color="bg-white" pin rotate={-1} padding="p-6">
            <Heading variant="heading-m" className="mb-1">
              HEB
            </Heading>
            <Text variant="body-l" className="font-bold text-gray-700">
              Customer Experience Manager
            </Text>
            <Text variant="fine" className="mb-4 font-bold uppercase text-gray-500">
              2017-2020 | Austin, TX
            </Text>
            <Text variant="body-base">
              Managed customer experience initiatives and knowledge transfer across the
              organization.
            </Text>
          </ContentBlock>
        </div>
      </div>

      {/* Education & Certifications */}
      <div>
        <Heading variant="heading-l" className="mb-8 inline-block border-b-4 border-black pb-2">
          Education & Certifications
        </Heading>
        <ContentBlock color="bg-white" pin rotate={2} padding="p-8">
          <ul className="space-y-4">
            {[
              'AI Fluency: Framework & Foundations — Anthropic',
              'Certificate of Persuasive Communication — eCornell',
              'Certificate of Statistics — eCornell',
              'Enterprise Design Thinking Co-Creator — IBM',
              'AAS in UX Design — Austin Community College',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-3 font-body text-lg font-bold">
                <Award className="mt-1 flex-shrink-0 text-gray-500" size={20} />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </ContentBlock>
      </div>

      {/* Outside of Work */}
      <div>
        <Heading variant="heading-l" className="mb-8 inline-block border-b-4 border-black pb-2">
          Outside of Work
        </Heading>
        <ContentBlock color="bg-white" pin rotate={-2} padding="p-8">
          <div className="flex flex-col items-center gap-8 md:flex-row">
            <div className="flex-1">
              <Text variant="body-xl" className="mb-6 font-bold">
                When I'm not building AI tools or writing about UX research, I make music.
              </Text>
              <Button
                href="https://youtu.be/Sg3xcHx-RRI?si=WaVnEWyDgUySVlug"
                target="_blank"
                rel="noopener noreferrer"
                intent="secondary"
              >
                <Music size={20} /> Listen here <ArrowRight size={20} />
              </Button>
            </div>
          </div>
        </ContentBlock>
      </div>

      {/* What's Next */}
      <div className="border-t-4 border-black py-12">
        <Heading variant="heading-l" className="mb-6">
          What's Next
        </Heading>
        <Text variant="body-xl" className="mb-8 max-w-2xl">
          I'm building tools for UX practitioners, writing about what actually works, and figuring
          out how to teach this stuff without adding to the AI hype noise.
        </Text>

        <div className="space-y-6">
          <div>
            <Label variant="eyebrow" className="mb-3 text-gray-500">
              Want to see what I'm working on?
            </Label>
            <div className="flex flex-wrap gap-4">
              <Button href="/fieldnotes" intent="secondary">
                <BookOpen size={20} /> Read Field Notes
              </Button>
            </div>
          </div>

          <div>
            <Label variant="eyebrow" className="mb-3 text-gray-500">
              Looking to collaborate?
            </Label>
            <Button href="/contact" intent="secondary">
              <Mail size={20} /> Get in touch
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AboutContent
