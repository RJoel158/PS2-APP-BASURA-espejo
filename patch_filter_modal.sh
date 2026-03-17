sed -i '/onScheduleSuccess={() => fetchActiveRequests()}/a \
            />\
          )}\
          {showFilterModal && (\
            <div style={{position:"absolute", top:0, left:0, width:"100%", height:"100%", backgroundColor:"rgba(0,0,0,0.5)", zIndex:9999, display:"flex", justifyContent:"center", alignItems:"center"}}>\
              <div style={{background:"white", padding:"20px", borderRadius:"8px", width:"90%", maxWidth:"350px"}}>\
                <h3 style={{marginTop:0, marginBottom:"15px", color:"#333"}}>Opciones de Filtrado</h3>\
                <div style={{marginBottom:"15px"}}>\
                  <label style={{display:"block", marginBottom:"5px", fontWeight:"bold"}}>Material:</label>\
                  <select style={{width:"100%", padding:"8px", borderRadius:"4px", border:"1px solid #ccc"}} value={filters.materialId} onChange={(e)=>setFilters({...filters, materialId: e.target.value})}>\
                    <option value="">Todos los materiales</option>\
                    {materials.map(m => (<option key={m.id} value={m.id}>{m.name}</option>))}\
                  </select>\
                </div>\
                <div style={{marginBottom:"20px"}}>\
                  <label style={{display:"block", marginBottom:"5px", fontWeight:"bold"}}>Día disponible:</label>\
                  <select style={{width:"100%", padding:"8px", borderRadius:"4px", border:"1px solid #ccc"}} value={filters.day} onChange={(e)=>setFilters({...filters, day: e.target.value})}>\
                    <option value="">Cualquier día</option>\
                    <option value="lun">Lunes</option>\
                    <option value="mar">Martes</option>\
                    <option value="mie">Miércoles</option>\
                    <option value="jue">Jueves</option>\
                    <option value="vie">Viernes</option>\
                    <option value="sab">Sábado</option>\
                    <option value="dom">Domingo</option>\
                  </select>\
                </div>\
                <div style={{display:"flex", justifyContent:"space-between", gap:"10px"}}>\
                  <button onClick={()=>{setFilters({materialId:"", day:""}); setShowFilterModal(false);}} style={{padding:"8px", background:"#f3f4f6", border:"none", borderRadius:"4px", cursor:"pointer", flex:1}}>Limpiar</button>\
                  <button onClick={()=>setShowFilterModal(false)} style={{padding:"8px", background:"#3b82f6", color:"white", border:"none", borderRadius:"4px", cursor:"pointer", flex:1}}>Aplicar</button>\
                </div>\
              </div>\
            </div>\
          )}' front/src/components/CollectorMapComps/Map.tsx
