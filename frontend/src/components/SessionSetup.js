import React, { useState, useEffect } from 'react';
import './SessionSetup.css';
import rolesConfig from '../config/rolesAndTechnologies.json';

const SessionSetup = ({ isOpen, onClose, onCreateSession }) => {
  const [formData, setFormData] = useState({
    user_name: '',
    company_name: '',
    interviewer_name: '',
    role: '',
    technologies: []
  });
  const [selectedTechnologies, setSelectedTechnologies] = useState([]);
  const [customTechnology, setCustomTechnology] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Get available technologies based on selected role
  const getAvailableTechnologies = () => {
    if (!formData.role || !rolesConfig || !rolesConfig.roles) return [];
    const roleConfig = rolesConfig.roles.find(r => r.id === formData.role);
    if (roleConfig && roleConfig.technologies) {
      // Split technologies string into array
      return roleConfig.technologies.split(', ').map(tech => tech.trim());
    }
    return [];
  };

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        user_name: '',
        company_name: '',
        interviewer_name: '',
        role: '',
        technologies: []
      });
      setSelectedTechnologies([]);
      setCustomTechnology('');
    }
  }, [isOpen]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear technologies when role changes
    if (name === 'role') {
      setSelectedTechnologies([]);
      setFormData(prev => ({
        ...prev,
        technologies: []
      }));
    }
  };

  const handleTechnologyToggle = (tech) => {
    const isSelected = selectedTechnologies.includes(tech);
    let newTechnologies;
    
    if (isSelected) {
      newTechnologies = selectedTechnologies.filter(t => t !== tech);
    } else {
      newTechnologies = [...selectedTechnologies, tech];
    }
    
    setSelectedTechnologies(newTechnologies);
    setFormData(prev => ({
      ...prev,
      technologies: newTechnologies
    }));
  };

  const handleAddCustomTechnology = () => {
    if (customTechnology.trim() && !selectedTechnologies.includes(customTechnology.trim())) {
      const newTech = customTechnology.trim();
      const newTechnologies = [...selectedTechnologies, newTech];
      setSelectedTechnologies(newTechnologies);
      setFormData(prev => ({
        ...prev,
        technologies: newTechnologies
      }));
      setCustomTechnology('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.user_name || !formData.company_name || !formData.interviewer_name || !formData.role) {
      alert('Please fill in all required fields');
      return;
    }

    setIsCreating(true);
    try {
      await onCreateSession(formData);
      onClose();
    } catch (error) {
      console.error('Error creating session:', error);
      alert('Failed to create session. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };


  if (!isOpen) return null;

  return (
    <div className="session-modal-overlay">
      <div className="session-modal">
        <div className="session-modal-header">
          <h2>Create New Interview Session</h2>
          <button className="session-modal-close" onClick={onClose}>×</button>
        </div>
          <form className="session-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="user_name">Your Name *</label>
              <input
                type="text"
                id="user_name"
                name="user_name"
                value={formData.user_name}
                onChange={handleInputChange}
                placeholder="Enter your name"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="company_name">Company Name *</label>
              <input
                type="text"
                id="company_name"
                name="company_name"
                value={formData.company_name}
                onChange={handleInputChange}
                placeholder="Enter company name"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="interviewer_name">Interviewer Name *</label>
              <input
                type="text"
                id="interviewer_name"
                name="interviewer_name"
                value={formData.interviewer_name}
                onChange={handleInputChange}
                placeholder="Enter interviewer's name"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="role">Role/Position *</label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                required
              >
                <option value="">Select a role</option>
                {rolesConfig && rolesConfig.roles && rolesConfig.roles.map((roleConfig) => (
                  <option key={roleConfig.id} value={roleConfig.id}>
                    {roleConfig.name}
                  </option>
                ))}
              </select>
            </div>

            {formData.role && (
              <div className="form-group">
                <label>Technologies/Skills</label>
                <div className="technologies-section">
                  <div className="technologies-grid">
                    {getAvailableTechnologies().map((tech) => (
                      <button
                        key={tech}
                        type="button"
                        className={`tech-btn ${selectedTechnologies.includes(tech) ? 'selected' : ''}`}
                        onClick={() => handleTechnologyToggle(tech)}
                      >
                        {tech}
                      </button>
                    ))}
                  </div>
                  
                  <div className="custom-tech">
                    <input
                      type="text"
                      value={customTechnology}
                      onChange={(e) => setCustomTechnology(e.target.value)}
                      placeholder="Add custom technology"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustomTechnology())}
                    />
                    <button type="button" onClick={handleAddCustomTechnology}>Add</button>
                  </div>
                </div>
              </div>
            )}

            <div className="form-actions">
              <button type="button" onClick={onClose}>Cancel</button>
              <button type="submit" disabled={isCreating}>
                {isCreating ? 'Creating...' : 'Start Interview Session'}
              </button>
            </div>
          </form>
      </div>
    </div>
  );
};

export default SessionSetup;