export const fadeInVariant = {
    hidden: { opacity: 0, y: 30 },
    visible: (custom = 0) => ({
        opacity: 1,
        y: 0,
        transition: {
            delay: custom * 0.1,
            duration: 0.8,
            ease: [0.25, 0.1, 0.25, 1], // very smooth easing
        },
    }),
};

export const slideInVariant = {
    hidden: { opacity: 0, x: -30 },
    visible: (custom = 0) => ({
        opacity: 1,
        x: 0,
        transition: {
            delay: custom * 0.1,
            duration: 0.8,
            ease: [0.25, 0.1, 0.25, 1],
        },
    }),
};
