---
title: "Context is King"
date: "Nov 26, 2025"
category: "AI & UX"
excerpt: "Learn why 'context engineering,' feeding LLMs documentation, outperforms complex prompting. Turn one-off solutions into scalable tools."
takeaways:
- title: "Context Over Prompts"
  text: "Stop trying to perfect your prompt wording. Instead, provide AI with the right documentation and information. It's like sending someone a map instead of trying to describe directions perfectly."
- title: "Context Engineering vs Prompt Engineering"
  text: "Building with AI is less about finding perfect phrases and more about determining what context (documentation, examples, specifications) will generate the desired behavior."
- title: "The Documentation Solution"
  text: "The author solved a Figma plugin challenge by feeding Claude the official Figma API documentation, not by refining prompts. The AI generated working code by having the right reference material."
- title: "Build the Builder"
  text: "Create reusable templates with documentation that others can use. One solution becomes scalable when you teach others how to inject the right context for their own problems."
- title: "Human-Driven RAG"
  text: "Your role is to be a curator of information, not a prompt expert. Find the right source material (official docs, guides, specifications) and provide it to the AI."
- title: "Limitations"
  text: "Context engineering only works when good source material exists. It excels at technical integration and established systems with documentation, but won't solve problems requiring subjective creative judgment."
- title: "Practical Approach"
  text: "Open two tabs: one with official documentation for your system, one with your LLM. Copy relevant sections into the LLM, describe your problem in plain language, and see what it builds."
---

# Context is King

The MS Teams notification lit up my screen at 3:30 PM.

I was deep in the work of building a survey for a project that wasn't interesting at all, but important stakeholders were waiting on it, so I had to deliver. I'd been clicking screener questions and likert rating scales for the past hour.

The message preview: Hey, you around for a quick call? Need your AI brain.

Honestly? I was relieved. An excuse to do something actually interesting.

My coworker was stuck documenting a complex UI component sheet. Tedious, mind-numbing work. Could I "vibe code something" with AI to fix it?

I hesitated before responding.

Not because of the task. Because I knew my limits. I'm great at the quick wins, the standalone AI hacks. But deep system integration? Building something that integrates with Figma? I had doubts.

I told him I'd look into it. I wasn't sure I actually could.

## The Fear Under the Block

What I didn't say on that call was that I didn't want to admit I might not be able to help.

A few months earlier, I'd built an LLM-powered heuristic evaluation assistant and a thematic analysis assistant. Both got rolled out company-wide to all UX team members. They were getting attention. A month before this Figma request, I'd led my team to second place in a company-wide AI ideathon.

I'd become the defacto AI guy. The person who teaches people about LLMs. The one who uses AI in creative ways to solve difficult problems.

And now I was stuck on a Figma plugin, the exact kind of creative problem I was supposed to excel at.

I'd been in this exact spot before. I sold vibe coding as something that would lead to "UX Engineering." Because of that I was put on a project to vibe code a design system documentation site. Trying different prompts, tweaking the wording, hoping the right combination of words would unlock the solution. It never did.

Pretty soon I was in over my head and we had to bring in real developers. It was humbling.

The truth is that I was treating AI like a magic spell. Find the perfect incantation, get the perfect result.

That's exhausting and it isn't a scalable approach.

## The Moment Everything Shifted

Let me take you back to that full day…

Earlier that morning, after standup, a coworker pulled me into an impromptu Zoom. They wanted to learn how to use LLMs better. I taught them the basics of prompting—you know, role assignment, temperature settings, that kind of thing. Then I walked them through context injection—the idea that you can feed an LLM specific information to guide its responses. We spent thirty minutes on it. I love this part of the work. This coworker was a self-described "Luddite." Seeing them flip to actively seeking AI guidance? I was thrilled.

I wrapped the call feeling good. Like I'd actually helped someone understand something useful.

Then later that afternoon, my other coworker pinged me about the Figma plugin.

I opened Claude. Tried different prompts. Refined the wording. Spent thirty minutes going in circles, the frustration building.

Then something clicked.

Wait.

That conversation this morning. Context injection. What if the Figma problem wasn't a coding problem at all? What if it was just… a context problem?

I was so convinced this would work that I raced to find the right context. But the whole time I couldn't stop thinking…

It can't be this easy.

The realization is that you don't need to memorize the recipe. You just need to know where the cookbook is.

## What Context Engineering Actually Means

I kept hearing "prompt engineering" everywhere. Optimize your prompts. Find the perfect phrasing. Make the AI do what you want.

But that's backwards.

Anthropic puts it perfectly: "Building with language models is becoming less about finding the right words and phrases for your prompts, and more about answering the broader question of 'what configuration of context is most likely to generate our model's desired behavior?'"

Think about giving someone directions. You can spend ten minutes trying to describe the route perfectly: "Turn left at the third light, no wait, the fourth light, or is it after the gas station?"

Or you can just send them a map.

The map is the context. Stop perfecting your description. Send the map.

## The Figma Documentation Experiment

I pulled up the official Figma Academy developer documentation. All of it. I didn't read through it carefully. I didn't need to understand it myself. I just needed to give it to the AI.

I copied the relevant sections: the API structure, the plugin examples, the method calls. Then I went back to Claude.

This time, I wasn't asking for a quick fix. I was setting up an environment where the AI could actually understand what I needed. I described the user experience we wanted: a tool that would automatically generate documentation for UI components.

I hit send and watched it generate code.

Real code. Code that actually referenced the correct Figma API methods. Code that I definitely couldn't have written myself.

I sat there staring at my screen thinking: "There's no way this actually works."

### Testing the Impossible

I copied the code into the Figma plugin editor. I was typing fast, trying to move quickly before I lost the momentum of the idea. I wanted to know if this would actually work or if I was just fooling myself.

This felt too easy. Years of required dev experience, bypassed by copying documentation?

I hit run.

The plugin loaded. No errors.

I opened a component in Figma, ran the plugin, and watched it pull the component properties and generate formatted documentation. Automatically. Exactly what my coworker needed.

I messaged him: Got something. Want to see it?

His response: Wait, seriously? Already?

### The Parking Lot Demo

The next morning, after standup, we went into our parking lot. The 15-minute open slot for quick demos and questions.

I shared my screen and ran the plugin in Figma. The documentation generated in seconds.

"Okay, that's great," my coworker said. "Can you make me one for layout specs too?"

That's when I showed them the actual breakthrough.

I pulled up the documentation I'd saved in Jira. A how-to file with the Figma docs and a template prompt. "This is how I built it. Anyone can use this to build their own plugins."

My coworker opened Claude on his second monitor, copied the template, and started describing the layout tool he needed. We all watched the code generate in real-time.

He looked at the screen. "Wait, it's really that simple?"

You could see it click for everyone. They got it.

## Building the Builder

I didn't just solve one problem. I built a tool for them to solve their own problems. It's a bit meta, but this type of thinking is what turns a one off solution to a scalable approach for the whole team.

Once you inject the right context (the specific documentation, the precise API structure), the AI stops being a single-task assistant. It becomes a tool that builds other tools.

My coworker didn't need me anymore. He needed the documentation and basic knowledge of how to frame the request. That's it.

Which was the goal, obviously. But I couldn't stop thinking about that moment.

I guess some part of me wondered: how many more times would I create AI solutions or teach myself out of work? Maybe that's dramatic. But it does feel like what all the headlines and AI hype are leading to.

The thing is, I'm not sure that's actually bad. Just… different than I expected.

One person's problem became a solution for the whole team. That's the difference between clever prompting and actual context engineering. But, I'm digressing, this is probably a topic I'll explore in a different post.

## Why Context Always Wins

You can spend hours perfecting your prompt. You can try different phrasings, different structures, different approaches.

But if the model doesn't have the right information, you're just hoping it guesses correctly.

The model has limited attention. Like your working memory when you're trying to remember a phone number while someone's talking to you. Why waste that attention making the AI figure out API structure when you can just provide it?

The skill isn't writing better prompts. It's knowing what information the AI is missing and where to find it.

This matters because it changes what skills you need to work effectively with AI.

You don't have to become an expert in prompt engineering, which is basically a whole field of study at this point, complete with frameworks and best practices and probably certification programs soon.

You have to learn how to find answers to your problems. And make good decisions about what's really needed to solve them.

It's sort of like human-driven RAG. Human in the loop. You're not trying to make the AI smarter through better prompting. You're making yourself a better curator of the information the AI needs.

That's a completely different skill. And honestly, it feels more sustainable than trying to keep up with the latest prompt engineering techniques.

## The Honest Limitation

This approach isn't magic. It only works when you have good source material.

If your context is vague, contradictory, or requires subjective creative judgment, this falls apart. I can't inject context to make AI write a novel only I could write or design something that needs my specific aesthetic judgment.

But for technical integration? For working with established systems that have documentation? For building tools that follow existing patterns? Context engineering changes everything.

## What You Can Do

You don't need to become a technical expert. You need to become a curator of good information.

Next time you're stuck on a hard problem, try this: Open two tabs. In one, find the official docs for whatever system you're working with—developer guide, how to article, or the book about this topic. In the other, open your LLM.

Copy the sections that seem relevant. Yes, all of them. Then describe what you need in plain language. Don't optimize your prompt. Just explain the problem like you're talking to a coworker who knows the system.

See what happens.

You might be surprised how much you can build without being the expert. You just need to know where the experts already wrote down what they know.

You might be the one giving demos in parking lots next week.
