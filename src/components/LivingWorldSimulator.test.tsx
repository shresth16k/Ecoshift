import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LivingWorldSimulator } from './LivingWorldSimulator';

describe('LivingWorldSimulator Component', () => {
  const defaultProps = {
    totalPoints: 200,
    hasCleanEnergy: false,
    theme: 'dark' as const,
    displayEcoScore: 65,
    showToast: () => {},
  };

  it('should render the biosphere container with correct test id', () => {
    render(<LivingWorldSimulator {...defaultProps} />);
    const biosphere = screen.getByTestId('living-world-svg');
    expect(biosphere).toBeInTheDocument();
  });

  it('should display the Living-World Biosphere title', () => {
    render(<LivingWorldSimulator {...defaultProps} />);
    expect(screen.getByText('Living-World Biosphere')).toBeInTheDocument();
  });

  it('should display the current Eco Score', () => {
    render(<LivingWorldSimulator {...defaultProps} />);
    expect(screen.getByText('Eco Score: 65')).toBeInTheDocument();
  });

  it('should show "Solar Suburban Oasis (Sustainable)" zone label when score is 65-80', () => {
    render(<LivingWorldSimulator {...defaultProps} displayEcoScore={70} />);
    expect(screen.getByText(/Solar Suburban Oasis/)).toBeInTheDocument();
  });

  it('should show "Industrial Smogscape (Degraded Grid)" zone label when score is below 45', () => {
    render(<LivingWorldSimulator {...defaultProps} displayEcoScore={30} />);
    expect(screen.getByText(/Industrial Smogscape/)).toBeInTheDocument();
  });

  it('should show "Eco-Futurist Utopia (Utopia)" zone label when score exceeds 90', () => {
    render(<LivingWorldSimulator {...defaultProps} displayEcoScore={95} />);
    expect(screen.getByText(/Eco-Futurist Utopia/)).toBeInTheDocument();
  });

  it('should show "Wind-Powered Valley (Recovering)" zone label when score is 45-65', () => {
    render(<LivingWorldSimulator {...defaultProps} displayEcoScore={55} />);
    expect(screen.getByText(/Wind-Powered Valley/)).toBeInTheDocument();
  });

  it('should show "Eco-City Future (Biodiverse)" zone label when score is 80-90', () => {
    render(<LivingWorldSimulator {...defaultProps} displayEcoScore={85} />);
    expect(screen.getByText(/Eco-City Future/)).toBeInTheDocument();
  });

  it('should display the improvement tip', () => {
    render(<LivingWorldSimulator {...defaultProps} />);
    expect(screen.getByText(/Keep improving your score/)).toBeInTheDocument();
  });

  it('should display "What is this?" interactive help button', () => {
    render(<LivingWorldSimulator {...defaultProps} />);
    expect(screen.getByText('What is this?')).toBeInTheDocument();
  });
});
