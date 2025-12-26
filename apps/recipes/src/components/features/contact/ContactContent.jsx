import React, { useState } from 'react'
import { Mail, Linkedin, Send, CheckCircle, AlertCircle } from 'lucide-react'
import SectionTitle from '../../ui/SectionTitle'

import ContentBlock from '../../ui/ContentBlock'
import Button from '../../ui/Button'
import { Heading, Text } from '../../ui/Typography'

// eslint-disable-next-line max-lines-per-function
const ContactContent = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  })
  const [status, setStatus] = useState({ type: '', message: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setStatus({ type: '', message: '' })

    try {
      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          access_key: '3e8f45b6-e931-4476-b671-e25163ebd962',
          name: formData.name,
          email: formData.email,
          subject: formData.subject,
          message: formData.message,
          from_name: formData.name,
          to_email: 'contact@emilioharrison.com',
        }),
      })

      const result = await response.json()

      if (result.success) {
        setStatus({
          type: 'success',
          message: "Thanks for reaching out! I'll get back to you soon.",
        })
        setFormData({ name: '', email: '', subject: '', message: '' })
      } else {
        throw new Error('Form submission failed')
      }
    } catch {
      setStatus({
        type: 'error',
        message:
          'Something went wrong. Please try emailing me directly at contact@emilioharrison.com',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const socialLinks = [
    {
      name: 'LinkedIn',
      url: 'https://www.linkedin.com/in/emilio-harrison/',
      icon: Linkedin,
      description: 'Professional network',
    },
  ]

  const inputClasses =
    'w-full px-4 py-3 font-body font-medium bg-white border-2 border-black text-ink placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-mustard shadow-hard-sm transition-shadow'

  return (
    <div className="animate-in fade-in relative z-10 duration-700">
      <SectionTitle>Get in Touch</SectionTitle>

      <div className="mb-12 max-w-3xl">
        <ContentBlock color="bg-white" pin rotate={-1} padding="p-8">
          <Text variant="body-xl" className="font-medium leading-relaxed">
            I'm always interested in talking shop, whether that's about UX research, AI, or just
            building cool things on the internet.
          </Text>
        </ContentBlock>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
        {/* Contact Form */}
        <div className="md:col-span-7">
          <ContentBlock color="bg-white" padding="p-8" rotate={-1} pin>
            <Heading variant="heading-l" className="text-ink mb-6">
              Send a Message
            </Heading>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="font-accent text-ink mb-2 block font-bold">
                  Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className={inputClasses}
                  placeholder="Your name"
                />
              </div>

              <div>
                <label htmlFor="email" className="font-accent text-ink mb-2 block font-bold">
                  Email *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className={inputClasses}
                  placeholder="your.email@example.com"
                />
              </div>

              <div>
                <label htmlFor="subject" className="font-accent text-ink mb-2 block font-bold">
                  Subject *
                </label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                  className={inputClasses}
                  placeholder="What's this about?"
                />
              </div>

              <div>
                <label htmlFor="message" className="font-accent text-ink mb-2 block font-bold">
                  Message *
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows="6"
                  className={inputClasses}
                  placeholder="Tell me what's on your mind..."
                />
              </div>

              {status.message && (
                <div
                  className={`flex items-start gap-3 border-2 border-black p-4 ${
                    status.type === 'success'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {status.type === 'success' ? (
                    <CheckCircle size={20} className="mt-0.5 flex-shrink-0" />
                  ) : (
                    <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />
                  )}
                  <Text variant="body-s" className="font-medium">
                    {status.message}
                  </Text>
                </div>
              )}

              <Button type="submit" fullWidth>
                {isSubmitting ? (
                  <>Sending...</>
                ) : (
                  <>
                    <Send size={20} />
                    Send Message
                  </>
                )}
              </Button>
            </form>
          </ContentBlock>
        </div>

        {/* Contact Info & Social Links */}
        <div className="space-y-8 md:col-span-5">
          {/* Direct Contact */}
          <ContentBlock color="bg-white" padding="p-6" rotate={2} pin>
            <div className="mb-4 flex items-start gap-4">
              <Mail className="text-black" size={28} />
              <div>
                <Heading variant="heading-m" className="mb-2 text-black">
                  Send an email
                </Heading>
                <a
                  href="mailto:contact@emilioharrison.com"
                  className="font-body font-bold text-black hover:underline"
                >
                  contact@emilioharrison.com
                </a>
                <Text variant="body-s" className="mt-2 text-gray-700">
                  I usually respond within a day or two. If it takes longer, I'm probably stuck on a
                  puzzle.
                </Text>
              </div>
            </div>
          </ContentBlock>

          {/* Social Links */}
          <ContentBlock color="bg-white" padding="p-6" rotate={-1} pin>
            <Heading variant="heading-m" className="mb-4 text-black">
              Connect Elsewhere
            </Heading>
            <div className="space-y-3">
              {socialLinks.map((link) => {
                const Icon = link.icon
                return (
                  <a
                    key={link.name}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shadow-hard-sm group flex items-center gap-3 border-2 border-black bg-white p-3 transition-colors hover:bg-gray-50"
                  >
                    <Icon size={24} className="text-black" />
                    <div className="flex-grow">
                      <Text
                        variant="body-base"
                        className="font-bold text-black group-hover:underline"
                      >
                        {link.name}
                      </Text>
                      <Text variant="body-s" className="text-gray-600">
                        {link.description}
                      </Text>
                    </div>
                  </a>
                )
              })}
            </div>
          </ContentBlock>

          {/* Quick Note */}
          <ContentBlock color="bg-white" pin rotate={1} padding="p-6">
            <Text variant="body-s" className="italic text-gray-700">
              Whether you're interested in collaborating, have a question about my work, or just
              want to swap book recommendations, I'm all ears.
            </Text>
          </ContentBlock>
        </div>
      </div>
    </div>
  )
}

export default ContactContent
