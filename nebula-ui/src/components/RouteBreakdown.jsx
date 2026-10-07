/**
 * Route Visualization Component
 * Displays detailed route breakdown with bridges, DEXs, and steps
 */

import React from 'react';
import { ArrowRight, Zap, Bridge, RefreshCw, Fuel, Info } from 'lucide-react';

/**
 * Get step type icon and color
 */
const getStepTypeInfo = (step) => {
  const action = step.action?.toLowerCase() || '';
  const tool = step.tool?.toLowerCase() || '';
  
  if (action.includes('bridge') || tool.includes('bridge') || tool.includes('stargate') || tool.includes('across')) {
    return {
      icon: Bridge,
      color: '#8B5CF6',
      label: 'Bridge',
      bgColor: 'rgba(139, 92, 246, 0.1)',
    };
  }
  
  if (action.includes('swap') || tool.includes('inch') || tool.includes('uniswap') || tool.includes('pancake')) {
    return {
      icon: RefreshCw,
      color: '#10B981',
      label: 'Swap',
      bgColor: 'rgba(16, 185, 129, 0.1)',
    };
  }
  
  return {
    icon: Zap,
    color: '#ff7120',
    label: 'Action',
    bgColor: 'rgba(255, 113, 32, 0.1)',
  };
};

/**
 * Single route step component
 */
const RouteStep = ({ step, index, isLast }) => {
  const typeInfo = getStepTypeInfo(step);
  const Icon = typeInfo.icon;
  const toolName = step.toolDetails?.name || step.tool || 'Unknown';
  const fromToken = step.action?.fromToken?.symbol || '';
  const toToken = step.action?.toToken?.symbol || '';
  
  // Gas cost for this step
  const stepGasCost = step.estimate?.gasCosts?.reduce((sum, gas) => 
    sum + parseFloat(gas.amountUSD || 0), 0
  ).toFixed(4) || '0';

  return (
    <div style={{ position: 'relative' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '14px',
        background: typeInfo.bgColor,
        border: `1px solid ${typeInfo.color}30`,
        borderRadius: '12px',
        transition: 'all 0.3s ease',
      }}>
        {/* Step Icon */}
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '10px',
          background: typeInfo.color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Icon size={20} color="white" />
        </div>

        {/* Step Details */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '0.85rem',
            fontWeight: 600,
            color: typeInfo.color,
            marginBottom: '4px',
          }}>
            {typeInfo.label} #{index + 1}
          </div>
          <div style={{
            fontSize: '0.95rem',
            fontWeight: 700,
            color: 'white',
            marginBottom: '4px',
          }}>
            {toolName}
          </div>
          <div style={{
            fontSize: '0.75rem',
            color: '#aaa',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}>
            <span>{fromToken}</span>
            <ArrowRight size={12} />
            <span>{toToken}</span>
            {stepGasCost !== '0' && (
              <>
                <span>•</span>
                <Fuel size={10} />
                <span>${stepGasCost}</span>
              </>
            )}
          </div>
        </div>

        {/* Time estimate if available */}
        {step.estimate?.executionDuration && (
          <div style={{
            fontSize: '0.7rem',
            color: '#888',
            textAlign: 'right',
            flexShrink: 0,
          }}>
            ~{Math.ceil(step.estimate.executionDuration / 60)}m
          </div>
        )}
      </div>

      {/* Connector line */}
      {!isLast && (
        <div style={{
          width: '2px',
          height: '16px',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.2), rgba(255,255,255,0.05))',
          margin: '4px 0 4px 20px',
        }} />
      )}
    </div>
  );
};

/**
 * Route breakdown component
 */
const RouteBreakdown = ({ route }) => {
  if (!route || !route.steps || route.steps.length === 0) {
    return (
      <div style={{
        padding: '1.5rem',
        textAlign: 'center',
        color: '#888',
        fontSize: '0.9rem',
      }}>
        No route details available
      </div>
    );
  }

  const totalSteps = route.steps.length;
  const isCrossChain = route.fromChainId !== route.toChainId;

  return (
    <div style={{
      padding: '1.5rem',
      background: 'rgba(0,0,0,0.3)',
      borderRadius: '16px',
      border: '1px solid rgba(255,255,255,0.08)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1.5rem',
        paddingBottom: '1rem',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        <div>
          <div style={{
            fontSize: '1.1rem',
            fontWeight: 700,
            color: 'white',
            marginBottom: '4px',
          }}>
            Route Breakdown
          </div>
          <div style={{
            fontSize: '0.75rem',
            color: '#aaa',
          }}>
            {totalSteps} step{totalSteps !== 1 ? 's' : ''} 
            {isCrossChain && ' • Cross-chain'}
          </div>
        </div>
        
        {route.tags?.includes('RECOMMENDED') && (
          <div style={{
            padding: '6px 12px',
            background: 'linear-gradient(135deg, #ff7120, #ff9d6e)',
            borderRadius: '8px',
            fontSize: '0.7rem',
            fontWeight: 700,
            color: 'white',
          }}>
            RECOMMENDED
          </div>
        )}
      </div>

      {/* Steps */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
        {route.steps.map((step, index) => (
          <RouteStep
            key={step.id || index}
            step={step}
            index={index}
            isLast={index === totalSteps - 1}
          />
        ))}
      </div>

      {/* Summary */}
      <div style={{
        marginTop: '1.5rem',
        padding: '1rem',
        background: 'rgba(255,255,255,0.02)',
        borderRadius: '12px',
        border: '1px solid rgba(255,255,255,0.05)',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
          fontSize: '0.8rem',
        }}>
          <div>
            <div style={{ color: '#888', marginBottom: '4px' }}>Total Gas</div>
            <div style={{ color: '#f87171', fontWeight: 700 }}>
              ${route.gasUSD || '0.00'}
            </div>
          </div>
          
          {route.totalFeesUSD && parseFloat(route.totalFeesUSD) > 0 && (
            <div>
              <div style={{ color: '#888', marginBottom: '4px' }}>Protocol Fees</div>
              <div style={{ color: '#FFC107', fontWeight: 700 }}>
                ${route.totalFeesUSD}
              </div>
            </div>
          )}
          
          {route.estimate?.executionDuration && (
            <div>
              <div style={{ color: '#888', marginBottom: '4px' }}>Est. Time</div>
              <div style={{ color: '#60A5FA', fontWeight: 700 }}>
                ~{Math.ceil(route.estimate.executionDuration / 60)} min
              </div>
            </div>
          )}
          
          <div>
            <div style={{ color: '#888', marginBottom: '4px' }}>You Receive</div>
            <div style={{ color: '#4CAF50', fontWeight: 700 }}>
              ${route.netValue || route.outputUSD || '0.00'}
            </div>
          </div>
        </div>
      </div>

      {/* Warning for high gas */}
      {parseFloat(route.gasUSD || 0) > 50 && (
        <div style={{
          marginTop: '12px',
          padding: '12px',
          background: 'rgba(251, 191, 36, 0.1)',
          border: '1px solid rgba(251, 191, 36, 0.3)',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '0.75rem',
          color: '#FCD34D',
        }}>
          <Info size={16} />
          <span>High gas cost detected. Consider swapping a larger amount to minimize fees.</span>
        </div>
      )}
    </div>
  );
};

export default RouteBreakdown;
