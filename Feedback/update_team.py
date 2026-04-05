import sys
import re

file_path = r'c:\Users\A S U S\Downloads\Feedback\team.html'
try:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Update CSS block
    css_pattern = re.compile(r'<style>.*?</style>', re.DOTALL)
    new_css = '''<style>
    .team-section {
      padding: 2rem 0 4rem;
      max-width: 1100px;
      margin: 0 auto;
    }
    
    .team-section h2 {
      color: var(--green);
      font-size: 2.5rem;
      margin-bottom: 3rem;
      text-align: center;
      font-family: var(--heading-font);
    }
    
    .team-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 2.5rem;
    }

    .team-member {
      background: rgba(255, 255, 255, 0.4);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.6);
      border-radius: 24px;
      padding: 2.5rem 1.5rem;
      box-shadow: 0 10px 30px rgba(13, 99, 27, 0.05);
      transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      text-align: center;
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      cursor: pointer;
    }

    .team-member:hover,
    .team-member:focus-within {
      transform: translateY(-10px);
      box-shadow: 0 20px 40px rgba(13, 99, 27, 0.12);
      border-color: rgba(255, 255, 255, 0.9);
      background: rgba(255, 255, 255, 0.6);
      outline: none;
    }

    .member-thumbnail {
      width: 160px;
      height: 160px;
      margin: 0 auto 1.5rem;
      border-radius: 50%;
      padding: 5px;
      background: linear-gradient(135deg, var(--green), var(--teal-light));
      position: relative;
      transition: all 0.4s ease;
    }
    
    .team-member:hover .member-thumbnail,
    .team-member:focus-within .member-thumbnail {
      transform: scale(1.05) rotate(5deg);
      box-shadow: 0 10px 25px rgba(13, 99, 27, 0.2);
    }

    .member-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 50%;
      background-color: #fff;
    }

    .member-info {
      margin-bottom: 0.5rem;
      width: 100%;
    }

    .member-name {
      color: var(--green);
      font-size: 1.5rem;
      font-weight: 700;
      font-family: var(--heading-font);
      margin-bottom: 0.25rem;
    }

    .member-role {
      color: var(--teal);
      font-size: 0.95rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      margin-bottom: 1rem;
    }

    .member-details {
      width: 100%;
      max-height: 0;
      overflow: hidden;
      opacity: 0;
      transition: all 0.5s ease;
    }

    .team-member:hover .member-details,
    .team-member:focus-within .member-details {
      max-height: 400px;
      opacity: 1;
      margin-top: 0.5rem;
    }

    .member-details .contributions {
      color: var(--text-main);
      font-size: 0.9rem;
      margin-bottom: 1rem;
      background: rgba(13, 99, 27, 0.05);
      padding: 0.75rem;
      border-radius: 12px;
      border: 1px solid rgba(13, 99, 27, 0.1);
    }

    .member-details .summary {
      color: var(--text-muted);
      font-size: 0.9rem;
      line-height: 1.6;
    }
  </style>'''
    content = css_pattern.sub(new_css, content, count=1)

    # 2. Cleanup HTML layout to remove duplicate info inside .member-details
    content = re.sub(r'<h4>.*?</h4>\s*<p class="role">.*?</p>\s*', '', content)
    
    # 3. Replace layout divs
    content = content.replace('<div class="center">\n      <div class="team">\n        <div class="title">\n          <h2>Student Team</h2>', '<div class="team-section">\n        <h2>Student Team</h2>')
    content = content.replace('          </div>\n        </div>\n      </div>\n    </div>\n  </main>', '          </div>\n    </div>\n  </main>')

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print('Styles and HTML successfully updated.')
except Exception as e:
    print('Error:', e)
