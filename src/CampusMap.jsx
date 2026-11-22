import React, { useEffect, useRef, useState } from 'react';
import { Box, Building2, Crosshair, Expand, Flag, Footprints, Image, Layers3, MapPin, Minimize, Minus, Plus, RotateCcw, X } from 'lucide-react';
import { mapLocations } from '../shared/sample.js';

const landmarkIcons = { Academic: Building2, Sports: Flag, Access: Footprints };

export function CampusMap() {
  const [mode, setMode] = useState('aerial');
  const [selected, setSelected] = useState(null);
  const [layerMenu, setLayerMenu] = useState(false);
  const [layers, setLayers] = useState({ Academic: true, Sports: true, Access: true });
  const [positions, setPositions] = useState([]);
  const [expanded, setExpanded] = useState(false);
  const [aerialZoom, setAerialZoom] = useState(1);
  const [modelError, setModelError] = useState(false);
  const mount = useRef(null);
  const scene = useRef(null);
  const requestedFocus = useRef(null);
  const map = useRef(null);
  const details = mapLocations.find(place => place.id === selected);

  useEffect(() => {
    if (mode !== '3d') return;
    let active = true;
    import('./model.js').then(({ createCampusModel }) => {
      if (!active) return;
      scene.current = createCampusModel(mount.current, setPositions);
      if (requestedFocus.current) scene.current.focus(requestedFocus.current);
    }).catch(() => {
      if (active) {
        setModelError(true);
        setMode('aerial');
      }
    });
    return () => {
      active = false;
      scene.current?.destroy();
      scene.current = null;
    };
  }, [mode]);

  useEffect(() => {
    if (!expanded) return;
    const escape = event => { if (event.key === 'Escape') setExpanded(false); };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [expanded]);

  function chooseMode(nextMode) {
    setPositions([]);
    requestedFocus.current = null;
    setAerialZoom(1);
    setSelected(null);
    setMode(nextMode);
  }

  function selectPlace(place) {
    setSelected(place.id);
    if (mode === '3d') {
      requestedFocus.current = place;
      scene.current?.focus(place);
    }
  }

  function startTour() {
    if (mode === '3d') {
      const next = mapLocations[(mapLocations.findIndex(place => place.id === selected) + 1) % mapLocations.length];
      setLayers(visible => ({ ...visible, [next.category]: true }));
      selectPlace(next);
      return;
    }
    if (modelError) {
      const next = mapLocations[(mapLocations.findIndex(place => place.id === selected) + 1) % mapLocations.length];
      setLayers(visible => ({ ...visible, [next.category]: true }));
      selectPlace(next);
      return;
    }
    const first = mapLocations[0];
    setSelected(first.id);
    setLayers(visible => ({ ...visible, [first.category]: true }));
    requestedFocus.current = first;
    setMode('3d');
  }

  function zoom(factor) {
    if (mode === '3d') scene.current?.zoom(factor);
    else setAerialZoom(current => Math.max(1, Math.min(1.7, current / factor)));
  }

  function reset() {
    setSelected(null);
    requestedFocus.current = null;
    setAerialZoom(1);
    scene.current?.reset();
  }

  return (
    <section className={`campus-map ${expanded ? 'is-expanded' : ''} ${mode === '3d' ? 'is-model' : ''}`} ref={map} aria-label="Interactive campus explorer">
      <div className="map-picture" aria-hidden="true" style={{ '--zoom': aerialZoom }} />
      {mode === '3d' && <div className="model-canvas" ref={mount} aria-label="Drag to orbit the 3D campus model" />}
      <div className="map-shading" />
      <div className="map-head">
        <span className="map-kicker"><span /> CAMPUS EXPLORER</span>
        <h2>Campus from above</h2>
        <p><MapPin size={15} /> Sohna, Gurugram</p>
      </div>
      <div className="map-modes" aria-label="Campus view">
        <button type="button" className={mode === 'aerial' ? 'active' : ''} aria-pressed={mode === 'aerial'} onClick={() => mode !== 'aerial' && chooseMode('aerial')}><Image size={16} /> Aerial</button>
        <button type="button" className={mode === '3d' ? 'active' : ''} aria-pressed={mode === '3d'} onClick={() => mode !== '3d' && chooseMode('3d')} disabled={modelError}><Box size={16} /> 3D model</button>
      </div>
      {mapLocations.map((place, index) => {
        const position = mode === '3d' ? positions[index] : {
          x: 50 + (place.x - 50) * aerialZoom, y: 50 + (place.y - 50) * aerialZoom, visible: true,
        };
        if (!position?.visible || !layers[place.category] || position.x > 96 || position.x < 4 || position.y > 91 || position.y < 15) return null;
        const Icon = landmarkIcons[place.category];
        return (
          <button key={place.id} type="button" className={`landmark landmark-${place.category.toLowerCase()} ${selected === place.id ? 'is-selected' : ''}`}
            style={{ left: `${position.x}%`, top: `${position.y}%` }} aria-pressed={selected === place.id} onClick={() => selectPlace(place)}>
            <span className="landmark-icon"><Icon size={14} /></span><span>{place.label}</span>
          </button>
        );
      })}
      <div className="map-controls">
        <button type="button" aria-label={expanded ? 'Exit expanded campus view' : 'Expand campus view'} title={expanded ? 'Exit expanded view' : 'Expand view'} onClick={() => setExpanded(value => !value)}>{expanded ? <Minimize size={19} /> : <Expand size={19} />}</button>
        <div>
          <button type="button" title="Zoom in" aria-label="Zoom in" onClick={() => zoom(.84)}><Plus size={20} /></button>
          <button type="button" title="Zoom out" aria-label="Zoom out" onClick={() => zoom(1.19)}><Minus size={20} /></button>
        </div>
        <button type="button" title="Reset view" aria-label="Reset campus view" onClick={reset}><Crosshair size={18} /></button>
      </div>
      <div className="map-bottom">
        <div className="map-layer-area">
          <button className="map-secondary" type="button" aria-expanded={layerMenu} onClick={() => setLayerMenu(value => !value)}><Layers3 size={17} /> Layers</button>
          {layerMenu && <fieldset className="layer-menu"><legend>Map landmarks</legend>
            {Object.entries(layers).map(([category, visible]) => <label key={category}><input type="checkbox" checked={visible} onChange={event => {
              setLayers({ ...layers, [category]: event.target.checked });
              if (details?.category === category && !event.target.checked) setSelected(null);
            }} />{category}</label>)}
          </fieldset>}
        </div>
        <span className="map-credit">{modelError ? '3D requires WebGL' : mode === '3d' ? 'Illustrative 3D model · Drag to orbit' : 'Illustrative aerial rendering'}</span>
        <button className="map-primary" type="button" onClick={startTour}>{mode === '3d' ? <RotateCcw size={16} /> : <Box size={17} />} {mode === '3d' || (modelError && selected) ? 'Next landmark' : 'Explore campus'}</button>
      </div>
      {details && <aside className="landmark-detail" aria-live="polite">
        <button type="button" className="icon-button" aria-label="Close landmark details" onClick={() => setSelected(null)}><X size={16} /></button>
        <small>{details.category}</small><strong>{details.label}</strong><p>{details.details}</p>
        {mode === 'aerial' && !modelError && <button type="button" className="text-button" onClick={() => { requestedFocus.current = details; setMode('3d'); }}>View in 3D</button>}
      </aside>}
    </section>
  );
}
