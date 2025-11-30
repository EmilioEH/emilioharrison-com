import React from 'react';
import { Mail, BookOpen } from 'lucide-react';
import Button from '../../ui/Button';
import ContentBlock from '../../ui/ContentBlock';
import { Text, Label } from '../../ui/Typography';

const Hero = () => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-24 items-center animate-in fade-in duration-700 relative z-10">
            <div className="md:col-span-7 space-y-8">
                <div className="inline-block transform -rotate-2">
                    <ContentBlock color="bg-white" padding="px-4 py-1" className="text-black" pin>
                        <Label variant="eyebrow">UX RESEARCHER & CREATIVE TECHNOLOGIST</Label>
                    </ContentBlock>
                </div>

                <ContentBlock
                    className="max-w-lg transform rotate-1"
                    padding="p-6"
                    color="bg-white"
                    pin
                >
                    <Text variant="body-xl" className="text-black font-bold leading-relaxed">
                        Building AI tools for real problems, not hype. Puzzle-obsessed. I write about what I'm learning, what I'm stuck on, and what's worth building in the first place.
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
            <div className="md:col-span-5 relative min-h-[400px] hidden md:flex items-center justify-center pointer-events-none">
                {/* Shapes or Image can go here. For now, keeping it clean as per prototype which focused on text/shapes in background */}
            </div>
        </div>
    );
};

export default Hero;
