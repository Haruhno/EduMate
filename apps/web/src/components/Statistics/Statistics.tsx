import React, { useEffect, useState } from 'react';
import styles from './Statistics.module.css';

import { IconQuantityQuality, IconFiability, IconProgression, IconSatisfaction } from '../../assets/icons.tsx';

import quantityImage from '../../assets/images/quantity-quality.jpg';
import fiabilityImage from '../../assets/images/fiabilite.png';
import progressImage from '../../assets/images/progression.png';
import satisfactionImage from '../../assets/images/satisfaction.png';

type StatKey = 'content' | 'conformity' | 'progress' | 'satisfaction';

const statsData = [
  {
    badge: 'Quantité & Qualité',
    badgeIcon: <IconQuantityQuality />,
    image: quantityImage,
    key: 'content',
    target: 16000,
    description: 'contenus pédagogiques disponibles',
    format: (n: number) => n.toLocaleString(),
  },
  {
    badge: 'Fiabilité',
    badgeIcon: <IconFiability />,
    image: fiabilityImage,
    key: 'conformity',
    target: 100,
    description: 'conforme au programme officiel',
    format: (n: number) => `${n} %`,
  },
  {
    badge: 'Progression',
    badgeIcon: <IconProgression />,
    image: progressImage,
    key: 'progress',
    target: 3.2,
    description: 'points de moyenne pour nos élèves',
    format: (n: number) => `+ ${n.toFixed(1).replace('.', ',')}`,
  },
  {
    badge: 'Satisfaction',
    badgeIcon: <IconSatisfaction />,
    image: satisfactionImage,
    key: 'satisfaction',
    target: 98,
    description: 'de nos clients sont satisfaits',
    format: (n: number) => `${n} %`,
  },
];

const Statistics: React.FC = () => {
  const [counts, setCounts] = useState({
    content: 0,
    conformity: 0,
    progress: 0,
    satisfaction: 0,
  });

  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const section = document.getElementById('statistics-section');
      if (section) {
        const rect = section.getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.8 && !animated) {
          setAnimated(true);
          animateCounters();
        }
      }
    };
    window.addEventListener('scroll', onScroll);
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [animated]);

  const animateCounters = () => {
    const duration = 1100;
    const steps = 60;
    const interval = duration / steps;

    statsData.forEach((stat, i) => {
      let step = 0;
      const target = stat.target;
      const key = stat.key;
      const isPercent = target <= 100 && Number.isInteger(target);

      const updateStep = () => {
        step++;
        const progress = step / steps;
        const easeOut = 1 - Math.pow(1 - progress, 3);
        let value = isPercent
          ? Math.min(Math.floor(easeOut * target), target)
          : parseFloat((easeOut * target).toFixed(1));

        setCounts((prev) => ({ ...prev, [key]: value }));

        if (step < steps) {
          setTimeout(updateStep, interval);
        } else {
          setCounts((prev) => ({ ...prev, [key]: target }));
        }
      };

      setTimeout(updateStep, i * 180); 
    });
  };

  return (
    <section id="statistics-section" className={styles.statisticsBg}>
      <div className={styles.container}>
        {statsData.map((stat) => (
          <div key={stat.key} className={styles.card}>
            <div className={styles.badge}>
              {stat.badge}<span className={styles.badgeIcon}>{stat.badgeIcon}</span>
            </div>
            <div className={styles.value}>{stat.format(counts[stat.key as StatKey])}</div>
            <p className={styles.description}>{stat.description}</p>
            <div className={styles.imageContainer}>
              <img 
                src={stat.image} 
                alt={stat.badge}
                className={styles.cardImage}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Statistics;