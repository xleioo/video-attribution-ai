import React, { useState } from 'react';

const videoData = [
  {
    id: 1,
    phase: '场景/痛点引入',
    icon: '🎬',
    time: '00:00-00:15',
    duration: 15,
    content: '话术提到"大家的新年三件套都安排上了嘛"，设定"过年宅家突击变美"的场景需求。',
    color: '#FF6B6B',
    tag: 'Hook'
  },
  {
    id: 2,
    phase: '产品引入',
    icon: '✨',
    time: '00:16-00:18',
    duration: 2,
    content: '展示怡丽丝尔紧湿带面霜（金管）产品特写，并口播产品名称。',
    color: '#4ECDC4',
    tag: 'Product'
  },
  {
    id: 3,
    phase: '信任背书/卖点阐述',
    icon: '🏆',
    time: '00:19-00:42',
    duration: 23,
    content: '强调"资生堂集团长公主"背景，提及"40年胶原蛋白研究"及"V-Firming CP"成分，建立专业信任感。',
    color: '#45B7D1',
    tag: 'Trust'
  },
  {
    id: 4,
    phase: '使用教程/效果演示',
    icon: '👆',
    time: '00:43-01:07',
    duration: 24,
    content: '详细展示三组按摩手法（下巴、法令纹、太阳穴），通过具体的按摩步骤展示产品的提拉紧致功能。',
    color: '#96CEB4',
    tag: 'Demo'
  },
  {
    id: 5,
    phase: '行动呼吁 (CTA)',
    icon: '🚀',
    time: '01:08-01:12',
    duration: 4,
    content: '展示护肤后皮肤状态，话术引导"年前变美护理赶紧GET起来"。',
    color: '#DDA0DD',
    tag: 'CTA'
  }
];

const totalDuration = 72;

export default function VideoAnalysis() {
  const [activeCard, setActiveCard] = useState(null);
  const [hoveredSegment, setHoveredSegment] = useState(null);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)',
      padding: '40px 20px',
      fontFamily: '"Noto Sans SC", -apple-system, BlinkMacSystemFont, sans-serif'
    }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '12px',
            background: 'rgba(255,255,255,0.05)',
            padding: '8px 20px',
            borderRadius: '100px',
            marginBottom: '20px',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            <span style={{ fontSize: '14px' }}>📹</span>
            <span style={{ 
              color: 'rgba(255,255,255,0.6)', 
              fontSize: '13px',
              letterSpacing: '2px',
              textTransform: 'uppercase'
            }}>Video Structure Analysis</span>
          </div>
          <h1 style={{
            fontSize: '32px',
            fontWeight: '700',
            color: '#fff',
            margin: '0 0 12px 0',
            letterSpacing: '-0.5px'
          }}>种草Vlog结构拆解</h1>
          <p style={{
            color: 'rgba(255,255,255,0.5)',
            fontSize: '15px',
            margin: 0
          }}>怡丽丝尔紧湿带面霜 · 总时长 01:12</p>
        </div>

        {/* Timeline Bar */}
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          borderRadius: '20px',
          padding: '24px',
          marginBottom: '32px',
          border: '1px solid rgba(255,255,255,0.06)'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '12px',
            color: 'rgba(255,255,255,0.4)',
            fontSize: '12px'
          }}>
            <span>00:00</span>
            <span>时间轴概览</span>
            <span>01:12</span>
          </div>
          <div style={{
            display: 'flex',
            height: '48px',
            borderRadius: '12px',
            overflow: 'hidden',
            gap: '3px'
          }}>
            {videoData.map((item, index) => (
              <div
                key={item.id}
                onMouseEnter={() => setHoveredSegment(item.id)}
                onMouseLeave={() => setHoveredSegment(null)}
                onClick={() => setActiveCard(activeCard === item.id ? null : item.id)}
                style={{
                  flex: item.duration,
                  background: hoveredSegment === item.id || activeCard === item.id
                    ? item.color
                    : `${item.color}99`,
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  transform: hoveredSegment === item.id ? 'scaleY(1.1)' : 'scaleY(1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  borderRadius: index === 0 ? '10px 4px 4px 10px' : index === videoData.length - 1 ? '4px 10px 10px 4px' : '4px'
                }}
              >
                {item.duration > 10 && (
                  <span style={{
                    color: '#fff',
                    fontSize: '11px',
                    fontWeight: '600',
                    opacity: 0.9,
                    textShadow: '0 1px 2px rgba(0,0,0,0.3)'
                  }}>{item.tag}</span>
                )}
              </div>
            ))}
          </div>
          {/* Duration labels */}
          <div style={{
            display: 'flex',
            marginTop: '8px',
            gap: '3px'
          }}>
            {videoData.map((item) => (
              <div
                key={item.id}
                style={{
                  flex: item.duration,
                  textAlign: 'center',
                  color: 'rgba(255,255,255,0.3)',
                  fontSize: '10px'
                }}
              >
                {item.duration}s
              </div>
            ))}
          </div>
        </div>

        {/* Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {videoData.map((item, index) => (
            <div
              key={item.id}
              onClick={() => setActiveCard(activeCard === item.id ? null : item.id)}
              style={{
                background: activeCard === item.id 
                  ? `linear-gradient(135deg, ${item.color}15 0%, ${item.color}08 100%)`
                  : 'rgba(255,255,255,0.02)',
                borderRadius: '20px',
                padding: '24px',
                cursor: 'pointer',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                border: activeCard === item.id 
                  ? `1px solid ${item.color}40`
                  : '1px solid rgba(255,255,255,0.06)',
                transform: activeCard === item.id ? 'scale(1.02)' : 'scale(1)',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* Background decoration */}
              <div style={{
                position: 'absolute',
                top: '-50px',
                right: '-50px',
                width: '150px',
                height: '150px',
                background: `radial-gradient(circle, ${item.color}10 0%, transparent 70%)`,
                pointerEvents: 'none'
              }} />
              
              <div style={{ display: 'flex', gap: '20px', position: 'relative' }}>
                {/* Left: Number + Icon */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '14px',
                    background: `linear-gradient(135deg, ${item.color} 0%, ${item.color}cc 100%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '22px',
                    boxShadow: `0 8px 24px ${item.color}40`
                  }}>
                    {item.icon}
                  </div>
                  <span style={{
                    color: 'rgba(255,255,255,0.3)',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}>0{index + 1}</span>
                </div>

                {/* Right: Content */}
                <div style={{ flex: 1 }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '10px'
                  }}>
                    <h3 style={{
                      margin: 0,
                      fontSize: '17px',
                      fontWeight: '600',
                      color: '#fff'
                    }}>{item.phase}</h3>
                    <span style={{
                      background: `${item.color}25`,
                      color: item.color,
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: '600'
                    }}>{item.tag}</span>
                  </div>
                  
                  <p style={{
                    margin: '0 0 14px 0',
                    color: 'rgba(255,255,255,0.65)',
                    fontSize: '14px',
                    lineHeight: '1.7'
                  }}>{item.content}</p>
                  
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'rgba(255,255,255,0.06)',
                    padding: '6px 12px',
                    borderRadius: '8px'
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M12 6v6l4 2"/>
                    </svg>
                    <span style={{
                      color: 'rgba(255,255,255,0.5)',
                      fontSize: '13px',
                      fontFamily: 'SF Mono, Monaco, monospace'
                    }}>{item.time}</span>
                    <span style={{
                      color: 'rgba(255,255,255,0.3)',
                      fontSize: '12px',
                      marginLeft: '4px'
                    }}>({item.duration}s)</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div style={{
          marginTop: '32px',
          background: 'linear-gradient(135deg, rgba(255,215,0,0.08) 0%, rgba(255,215,0,0.02) 100%)',
          borderRadius: '20px',
          padding: '28px',
          border: '1px solid rgba(255,215,0,0.15)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: '0',
            left: '0',
            right: '0',
            height: '3px',
            background: 'linear-gradient(90deg, #FFD700, #FFA500, #FF6B6B, #4ECDC4, #45B7D1)',
          }} />
          
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '16px'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              flexShrink: 0
            }}>💡</div>
            <div>
              <h4 style={{
                margin: '0 0 12px 0',
                color: '#FFD700',
                fontSize: '15px',
                fontWeight: '600',
                letterSpacing: '0.5px'
              }}>结构总结</h4>
              <p style={{
                margin: 0,
                color: 'rgba(255,255,255,0.7)',
                fontSize: '14px',
                lineHeight: '1.8'
              }}>
                视频采用典型的<span style={{ color: '#4ECDC4', fontWeight: '500' }}>"种草Vlog"</span>结构，通过<span style={{ color: '#FF6B6B', fontWeight: '500' }}>"过年急救"</span>这一强时效性场景切入，结合高背书（资生堂）和低门槛高感知的使用教程（按摩手法），有效降低了用户对高单价抗老产品的决策难度，重点在于通过按摩手法将<span style={{ color: '#96CEB4', fontWeight: '500' }}>"紧致"</span>卖点可视化。
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          marginTop: '40px',
          textAlign: 'center',
          color: 'rgba(255,255,255,0.3)',
          fontSize: '12px'
        }}>
          点击时间轴或卡片查看详情
        </div>
      </div>
    </div>
  );
}
