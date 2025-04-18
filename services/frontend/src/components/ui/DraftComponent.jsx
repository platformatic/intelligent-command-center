import React from 'react'
export default function DraftComponent ({ text, children }) {
  if (!text) {
    text = 'This is a draft component'
  }
  const wrapperStyle = {
    margin: '10px 0',
    padding: '5px',
    // background: 'repeating-linear-gradient( 45deg, black, black 35px, yellow 35px, yellow 70px)',
    background: 'repeating-linear-gradient( -45deg, black, black 20px, yellow 20px, yellow 40px )'
  }
  const contentStyle = {
    padding: '20px',
    background: 'black',
    width: '100%',
    height: '100%'
  }
  return (
    <div>
      <div style={wrapperStyle}>
        <div style={contentStyle}>
          <p>{text}</p>
        </div>
      </div>
      {children}
    </div>

  )
}
