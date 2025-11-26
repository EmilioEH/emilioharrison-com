import React from 'react';
import Hero from '../components/Hero';
import BlogList from '../components/BlogList';

const Home = ({ theme }) => (
    <>
        <Hero theme={theme} />
        <BlogList theme={theme} />
    </>
);

export default Home;
