/**
 * Layer Effects Section
 * Mounts the high-fidelity LayerEffectsPanel component
 */

import React from 'react';
import { SynthParams } from '../types/synth';
import { LayerEffectsPanel } from './LayerEffects/LayerEffectsPanel';

interface EffectsSectionProps {
  params: SynthParams;
  onUpdateParams: (newParams: Partial<SynthParams>) => void;
}

export const EffectsSection: React.FC<EffectsSectionProps> = ({ params, onUpdateParams }) => {
  return (
    <div className="w-full flex justify-center">
      <LayerEffectsPanel params={params} onUpdateParams={onUpdateParams} embeddedInRack={true} />
    </div>
  );
};
