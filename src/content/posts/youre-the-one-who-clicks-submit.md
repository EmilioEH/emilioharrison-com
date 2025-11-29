---
title: "You're the One Who Clicks Submit"
status: published
date: "Nov 26, 2025"
category: "Lessons Learned"
tags: ["llm", "ai-testing", "accountability", "ux-research", "hallucinations", "human-in-the-loop"]
excerpt: "When you use an LLM, you're the driver. Learn why 'good enough' is a trap and how to use a simple testing framework to verify AI outputs before shipping."
takeaways:
- title: "The Temptation to Ship Without Testing"
  text: "Building an LLM-powered heuristic evaluation tool that looked professional and sounded authoritative, but realizing there was no verification it actually worked beyond one test case. The output looked 'good enough' but that wasn't the same as being reliable."
- title: "The Deloitte Wake-Up Call"
  text: "Deloitte had to refund $400,000 after an AI tool hallucinated in a government report. This highlighted the nightmare scenario: impressive outputs with someone's credibility attached, only to discover later it was wrong."
- title: "The 5x5 Testing Protocol"
  text: "Developed a simple testing methodology: run the same input 5 times to check consistency, then test on 5 different scenarios to verify it generalizes. Not statistically rigorous, but enough to move from 'I hope this works' to 'I've tested it.'"
- title: "When to Test (and When Not To)"
  text: "Use rigorous testing when prompts will be reused by others and scalability matters. Skip it for one-off analyses or personal decision-making. Always maintain human-in-the-loop for verification and choose low-risk, reversible use cases."
- title: "You Own the Output"
  text: "When you click submit on LLM-generated work, you're accountable—not the AI. You can't blame the tool when something goes wrong. Before shipping outputs others will trust, you need to verify accuracy and consistency, not just that it 'looks good.'"
- title: "The Unsolved Challenges"
  text: "Still uncertain if 5x5 is sufficient for high-stakes scenarios. Difficult to convince fast-moving teams to test when nothing's gone wrong yet. Testing adds friction in a culture that values AI for speed, making it feel like resisting progress rather than professionalism."
---

# You're the One Who Clicks Submit

My finger hovered over the "Copy" button.

I was staring at Claude's output on my second monitor. The heuristic evaluation looked clean. Professional formatting, proper severity ratings, all ten heuristics addressed. The kind of thing that would make stakeholders nod approvingly in a presentation.

But I couldn't shake this question: What if someone actually uses this?

Six months earlier, my coworker built something that made me simultaneously impressed and jealous. He created a prompt injection platform with a clever workaround. No RAG capabilities? Just embed the entire knowledge base in the system prompt. The first LLM assistant he created was a dark and deceptive pattern evaluator. Upload UI screenshots, get back analysis of dark and deceptive patterns. The results were undeniably compelling.

That's when the lightbulb went off: We could do the same thing for heuristic evaluation.

I told him about the idea. He built a prototype. Immediately, I felt that competitive itch: This was my idea and I'm the UX researcher. I have to show this guy I can build something better. (Petty, I know)

## The Problem With "Good Enough"

I started with his first draft and began adapting it. Added UXR knowledge from years of running heuristic evaluations myself. Refined the prompt. Tested it on a UI screen I knew had problems. Adjusted the wording. Tested again.

After a half-dozen rounds of tweaking, the fifth iteration caught every issue I'd already identified. I looked at the output and thought, This is good enough to ship.

That's when the real question hit me: But how do I actually know it works?

I'd proven it worked once. On one screen. That I already understood.

But I was about to hand this to other researchers and designers. Who would use it on designs I'd never seen. And trust the output enough to make decisions based on it.

What happens when someone runs this on a different UI? What if they present the findings to stakeholders? What if those stakeholders make product decisions based on what the LLM said?

I realized I had no answer. I'd built something that looked professional, sounded authoritative, and might be completely unreliable.

Just click copy. It's fine. It looks good.

But that voice saying "it's fine" was me being lazy. I had almost convinced myself that I could realize this in the wild. Until I saw what happens when someone skips it.

The Deloitte headline: $400,000 refund because an AI tool hallucinated. Someone at Deloitte probably had a good day when they submitted that report. Fast turnaround, impressive output. Then came the discovery that it was wrong. With their name on it. With their credibility attached to it.

That's the nightmare scenario. Not a pulled tool. A $400K mistake.

I was starting to see a common thread from my own work and now the Deloitte headline: someone decided an LLM output was good enough without verifying it actually was.

## Figuring Out Good Enough to Tested

I didn't sit down and design a testing methodology. I just tried answering open questions.

First question: Does it give me the same answer with the same inputs?

I ran the same design through the same prompt five times. Not because five is statistically rigorous. It's not. But because it felt like enough to see if a pattern held.

I sat there watching each output generate.

First run: identifies contrast issues, navigation problems, three severity-high items.
Second run: same issues, different wording.
Third run: same issues, different wording. Wait… 1 new issue…. Hmm interesting.
Fourth run: back to the same issues, different wording.
Fifth run: same issues, different wording.

Five out of five consistent with some variance. Is that good enough to claim tested? I didn't know. But at least now I knew consistency was a thing I needed to measure. And I had a table stakes approach.

The outputs varied in wording, obviously. LLMs are probabilistic. But I wasn't looking for identical text. I was checking whether it consistently identified the same usability issues at the same severity levels.

Then the second question emerged: What if I just made a prompt that was hard-coded to find usability issues in the one screen? (I think in the industry they call this over-fitting)

I needed to know if the prompt would scale. So I grabbed five different UI designs I was already familiar with, ones where I knew the usability problems. Ran each through the prompt. Waited for the outputs.

Screen one: caught the issues I expected.
Screen two: caught those too, plus flagged something I'd missed.
Screen three: clean identification.
Screen four: clean.
Screen five: clean, with one extra insight that actually made sense.

Again, the "5" was arbitrary. It seemed like a good round number. Enough to feel confident without spending a week on testing.

That moment, watching it work on designs it had never seen, that's when I felt like I could actually hand this to someone else. Not because I'd proven it was perfect. Because I'd verified it was consistent and it generalized beyond the sample I'd tuned it on.

I set the threshold at 5x5: five runs for consistency, five different scenarios for accuracy. Is that sufficient? I still don't know. But it's the line between "I hope this works" and "I've tested it."

That testing protocol felt sufficient for what I was building.

## The Line I'm Still Drawing

So where's the line? When is testing paranoia versus professionalism?

I use the test when the prompt will be reused and used by others. Scalability is the trigger. If I'm building something that five people, or fifty people, will rely on, I use the 5x5 threshold: five runs for consistency, five different scenarios for accuracy.

But I don't test everything. One-off prompts? Quick analyses for my own decision-making? I get something good enough and move on. The key difference is who's relying on it and what's at stake if it's wrong.

I also intentionally pick use cases that are low-risk and revertable. Human in the loop, always. I'm not building fully automated systems because I don't trust that I could test them thoroughly enough.

That's the safety net. Low stakes, easy to fix if something goes sideways, always a person checking the work. Capitalizing on "human-in-the-loop" is key.

I'm still not sure if that's enough.

## The Questions I Can't Answer Yet

Is the 5x5 threshold actually sufficient for high-stakes scenarios? It feels right based on my experience, but "feels right" isn't exactly rigorous methodology. What if I need 10x10? What if the stakes are high enough that even thorough testing isn't enough? What if I need a large scale fully automated python script testing?

And then there's the practical problem: How do I convince other people to test when they just want to ship fast?

I've watched colleagues grab an LLM output, glance at it, and immediately use it in a presentation or send it to a client. When I suggest testing it first, I get the look: Why are you wasting time? It looks good.

It's hard to argue for caution when nothing's gone wrong yet. The Deloitte story helps, but it feels distant. That was a massive consulting firm, not us. Until something breaks in a visible, costly way, testing feels like paranoia instead of professionalism.

And I've gotten questions from peers about losing any efficiency gains because I spend time testing.

The bigger challenge is scaling this practice across a team that's moving fast. Even if I convince people to test, who has time? We're all under pressure to deliver quickly. Testing adds friction. And in a world where "AI makes everything faster," stopping to verify outputs feels like you're resisting progress.

My point is this: when you use an LLM to do work, you're still the one accountable for the output.

## You're the Driver

The AI didn't submit the Deloitte report. A person did. When something generated by an LLM goes wrong, you don't get to say, "Oops, the AI messed up." You're the driver, not the passenger.

Before you ship an LLM output that other people will trust, you have to be willing to defend it. Not just "it looks good," but "I've verified it's accurate and consistent."

The person at Deloitte who submitted that hallucinated report probably wishes they'd spent an extra hour testing it.

I'd rather be the person who tests too much than the person who tests too little and learns the hard way.

If you're building LLM-powered tools, what's your testing threshold? How do you know when "good enough" is actually good enough? I'm still figuring this out. If you've found answers I haven't, I want to hear them.
