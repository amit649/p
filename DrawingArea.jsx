import React, { useState,useRef, useEffect } from 'react'
import rough from 'roughjs';
import useDraw from '../context/useDraw';

function cartesianDistance(x1,y1, x2,y2){
  return Math.round((Math.sqrt(Math.pow(y2-y1,2) + Math.pow(x2-x1,2))))
}

const gen = rough.generator()

function DrawingArea() {

    const canvasRef = useRef(null)
    const [action, setAction] = useState('none')
    const [movingElement, setMovingElement] = useState(null) // for keeping track of the selected element using selection tool
    const [panOffset, setPanOffset] = useState({x:0, y:0})
    const [initialPoints, setInitialPoints] = useState({x:0, y:0})
    const [scaleOffset,setScaleOffset] = useState({x:0, y:0})
    const [points,setPoints] = useState([])

    const {elements, setElements,strokeWidth,setStrokeWidth,stroke,setStroke, setRoughness,
      roughness, currentTool,setCurrentTool,elemenHistory, setElementHistory, isMoving, setMoving,scale, setScale} = useDraw()


    const createElement = (id, type,x1,y1,x2,y2,options,pointsArr ) => {

      // creating line element
      if(currentTool === 'line' || type === 'line'){
        const element = gen.line(x1,y1,x2,y2, options)
        return {id, type,x1,y1,x2,y2, element, options}
      }

      // creating RECTANGLE element
      if(currentTool === 'rectangle' || type === 'rectangle'){
        
        const element = gen.rectangle(x1,y1,x2-x1,y2-y1,options)
        
        return {id,type,x1,y1,x2,y2, element}
      }

      // creating ellipse element
      if(currentTool === 'ellipse' || type === 'ellipse'){

        // ellipse(centerX, centerY, width, height)
        const element = gen.ellipse((x1+x2)/2,(y1+y2)/2,x2-x1,y2-y1, options)
        return {id,type,x1,y1,x2,y2, element}

      }

      // creating rhombus element
      if(currentTool === 'rhombus' || type === 'rhombus'){

        // used some maths for calculating points of rhombus
        // A-> top, B-> left, C-> bottom, D-> right
        const A = [x1+Math.floor((x2-x1)/2) , y1] 
        const B = [x1, Math.floor((y2-y1)/2)  + (y2+y1)/2]
        const C = [x1+Math.floor((x2-x1)/2) , y2-y1+y2]
        const D = [x2,Math.floor((y2-y1)/2)  + (y2+y1)/2]
        const pts = [A,B,C,D]


        const element = gen.polygon(pts,options)
        return {id,type,x1,y1,x2,y2,pts, element}
      }

      // creating triangle element
      if(currentTool === 'triangle' || type === 'triangle'){

        // used some maths for calculating points of triangle
        // A-> top, B-> left, C-> right
        const A = [x1+Math.floor((x2-x1)/2) , y1] 
        const B = [x1, y2]
        const C = [x2, y2]
        const pts = [A,B,C,A]


        const element = gen.polygon(pts,options)
        return {id,type,x1,y1,x2,y2,pts, element}
      }

      //creating pen element
      if(currentTool === 'pen' || type === 'pen') {

        const element = gen.curve(pointsArr,options)
        return {id,type,pointsArr, element}
      }

      //creating eraser element
      if(currentTool === 'eraser') {
        const element = gen.curve(pointsArr,options)
        return {id,type,x1,y1,x2,y2, element}
      }
    
    }

    const updateElement = (index,currentTool, x1,y1,x,y,options,points) => {

      if(currentTool === 'pen' || currentTool === 'eraser'){
        const element = createElement(index+1,currentTool, x1,y1,x,y,options,points)
        const tempElements = [...elements]
        tempElements[index] = element
        setElements(tempElements)
      }
      else{
        const options = {stroke:stroke, strokeWidth, roughness:roughness}
        const element = createElement(index+1,currentTool, x1,y1,x,y, options)
        
        const tempElements = [...elements]
        tempElements[index] = element
        setElements(tempElements)
      }

    }

    // for finding if a element exists on the given point
    const elementFinder = (x,y,element) => {
      const {x1,y1,x2,y2,type} = element

      // Line -> AB, to check if a point P lies on line => dist(AB) = dist(AP) + dist(PB)
      if(type === 'line'){
        const lineDist = cartesianDistance(x1,y1,x2,y2)
        const pointDist = cartesianDistance(x,y,x1,y1) + cartesianDistance(x,y,x2,y2)
        if( lineDist === pointDist){
          return element
        }
      }
      
      // checking for rectangle and ellipse
      else if(type === 'rectangle' || type === 'ellipse'){
        const maxX = Math.max(x1,x2)
        const maxY = Math.max(y1,y2)
        const minX = Math.min(x1,x2)
        const minY = Math.min(y1,y2)
        
        if(action === 'erasing'){
          if((x <= maxX+10 && x >= minX-10 && y<= maxY+10 && y>=minY-10) &&
            ((Math.abs(x-minX) < 10 && y<=maxY && y>=minY) || (Math.abs(x-maxX) < 10 && y<=maxY && y>=minY) || 
            (Math.abs(y-minY) < 10 && x<=maxX && x>=minX) || (Math.abs(y-maxY) < 10 && x<=maxX && x>=minX))){
            return element
          }
        }
        else{          
          if(x <= maxX && x >= minX && y<= maxY && y>=minY){
            
            return element
          }
          
        }
      }

      //if point P lies inside triangle => area(ABC) = area(PAB) + area(PAC) + area(PBC)
      else if(type === 'triangle'){
        const {pts} = element
        const A = pts[0]
        const B = pts[1]
        const C = pts[2]
        const P = [x,y]
    
        const area = (x1,y1,x2,y2,x3,y3) => {
          // Area A = [ x1(y2 – y3) + x2(y3 – y1) + x3(y1-y2)]/2 
          return Math.abs((x1*(y2-y3) + x2*(y3-y1)+ x3*(y1-y2))/2.0)
        }
        const originalArea = area(A[0],A[1],B[0],B[1],C[0],C[1])
        const testArea = area(P[0],P[1],A[0],A[1],B[0],B[1]) + area(P[0],P[1],B[0],B[1],C[0],C[1]) + area(P[0],P[1],A[0],A[1],C[0],C[1])
    
        if(originalArea === testArea) return  element
      }
    
      else if(type=== 'rhombus'){
        const {pts} = element
    
        function inside(point, vs) {
          // ray-casting algorithm based on
          // https://wrf.ecse.rpi.edu/Research/Short_Notes/pnpoly.html
          
          var x = point[0], y = point[1];
          
          var inside = false;
          for (var i = 0, j = vs.length - 1; i < vs.length; j = i++) {
              var xi = vs[i][0], yi = vs[i][1];
              var xj = vs[j][0], yj = vs[j][1];
              
              var intersect = ((yi > y) != (yj > y))
                  && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
              if (intersect) inside = !inside;
          }
          
          return inside;
      }
    
        if(inside([ x, y ], pts)){
          return element
        }
      }

      else if(type === 'pen'){

        const {pointsArr} = element

        for(let i =0; i<pointsArr.length; i++){

          const currX = pointsArr[i][0]
          const currY = pointsArr[i][1]

          if(Math.abs(currX-x) <=10 && Math.abs(currY-y) <= 10){
            const obj = {element:element, X: currX, Y: currY}
            return obj        
          }
        }

      }
      
    }
    
    //looping through each element and checking if point P lies on the element
    const findElement = (x,y,elements) => {
      return (elements.find(element => elementFinder(x,y,element)))
    }


    useEffect(()=>{
      
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      const roughCanvas =  rough.canvas(canvas)
      ctx.clearRect(0,0,canvas.width,canvas.height)    
            
      const scaleWidth = canvas.width * scale
      const scaleHeight = canvas.height * scale
      const scaleOffsetX = (scaleWidth - canvas.width)/2
      const scaleOffsetY = (scaleHeight - canvas.height)/2
      setScaleOffset({x:scaleOffsetX, y:scaleOffsetY})


      ctx.save()
      ctx.translate(panOffset.x*scale - scaleOffsetX, panOffset.y*scale -scaleOffsetY)
      
      ctx.scale(scale,scale)

      if(elements.length > 0){
        elements.forEach((obj) => {
          if(!obj)  return
          // this is for drawing elements
          if(obj.element){
            roughCanvas.draw(obj.element)
          }
          else  return
  
        })
      }
      ctx.restore()


      const DownEvent=(e)=>{
        const x = (e.clientX - panOffset.x*scale + scaleOffsetX)/scale 
        const y = (e.clientY - panOffset.y*scale + scaleOffsetY)/scale

        // if selection tool is selected
        if(currentTool === 'moving'){
          setAction('moving')
          if(elements){
    
            //getting the element at the point x,y
            const currElement = findElement(x,y, elements)  
            if(currElement){
              setStrokeWidth(currElement.element.options.strokeWidth)     
              if(currElement.type ==='pen'){
                const {pointsArr} = currElement
                setPoints(pointsArr)
                
                let offsetX = pointsArr.map(point => x - point[0]) 
                let offsetY = pointsArr.map(point => y - point[1])  
            
                setMovingElement([currElement,offsetX,offsetY])
              }
              else{

                const offsetX = x-currElement.x1
                const offsetY = y-currElement.y1
                setMovingElement([currElement,offsetX,offsetY]) //Data of selected element at point x,y
              }
            }
          }

        }
        else if(currentTool === 'pan'){
          setAction('panning')
          setInitialPoints({x:x, y:y})
        }
        else{
          setAction('drawing')
          const index = elements.length
          if(currentTool === 'pen' || currentTool === 'eraser'){  
            
            // clearing array of points
            setPoints([])
            setRoughness(0.5)
            let options = {stroke:stroke, strokeWidth:strokeWidth, roughness:roughness, curveFitting: 1}
            if(currentTool === 'eraser'){
              options = {stroke: "white",strokeWidth: strokeWidth, roughness: roughness}
              
            }
            
              // setting first point on mouse down
              setPoints(pts=> [...pts,[x,y]])
              const element = createElement(index,currentTool,x,y,x,y,options,points)
              
              //initialising the linearShape element
              setElements(prev => [...prev,element])
            
          }
  
          // creating initial element for line and rectangle
          else{
            const options = {stroke:stroke, strokeWidth, roughness:roughness}
            const element = createElement(index,currentTool,x,y,x,y,options)
            setElements(prev => [...prev,element])
          }          
        }

      }
      const MoveEvent=(e)=>{

        const x = (e.clientX - panOffset.x*scale + scaleOffsetX)/scale 
        const y = (e.clientY - panOffset.y*scale + scaleOffsetY)/scale
          
          if(currentTool === 'pan' && action === 'panning'){
            setPanOffset(prev => ({x:prev.x+(x-initialPoints.x), y:prev.y + (y-initialPoints.y)}))
          }

          if(action === 'drawing' && currentTool !== 'pan') {
            
            // getting index of last element in array
            const index = elements.length -1
            const {x1,y1} = elements[index]
  
            if(currentTool === 'pen' || currentTool === 'eraser'){            
              
              // updating array of points on mouse movement
              setPoints(points=> [...points,[x,y]])
  
              let options = {stroke:stroke, strokeWidth:strokeWidth, roughness:roughness}
              if(currentTool === 'eraser'){
                options = {stroke: "white",strokeWidth: strokeWidth, roughness: 0}
              }
              
              updateElement(index,currentTool, x1,y1,x,y,options, points)
              
            }
            
            // for line and rectangle
            else{
              
              const options = {stroke:stroke, strokeWidth, roughness:roughness}
              updateElement(index, currentTool, x1,y1,x,y,options)
            }
          }

          else if(action === 'moving'){
            
            if(!movingElement)  return
            const type = movingElement[0].type // geting shape type
            const {options} = movingElement[0].element // getting options of the element
            
            if(type === 'pen'){

              const element = movingElement[0]
              let {id} = element

              let pointsArr = [...points]
              let offsetX = movingElement[1]
              let offsetY = movingElement[2]

              for(let  i=0; i < pointsArr.length; i++){
                pointsArr[i][0] = x-offsetX[i]
                pointsArr[i][1] = y-offsetY[i]
              }

              // setPoints(pointsArr)
              updateElement(id-1,type,pointsArr[0][0],pointsArr[0][1],pointsArr[1][0], pointsArr[1][1], options,pointsArr)
              
            }
            else if(type && type != 'pen'){
              const newX = (x-movingElement[1])
              const newY = (y-movingElement[2])

                const {id,type, x1,y1,x2,y2} = movingElement[0]
                
                //updating the element on mouse move
                updateElement(id-1,type,newX,newY,newX+x2-x1, newY+y2-y1, options)
                
              }

          }

          else{
            return
          }
          
      }
      const UpEvent=()=>{
        setAction('none')
        setPoints([])
        setMovingElement(null)
        ctx.closePath()
      }
      const onMouseDown = (e) =>{
        DownEvent(e);
        
      }

      const onMouseMove = (e) => {
        MoveEvent(e)
      }

      const onMouseUp = () => {
        UpEvent()
      }
      const onTouchDown = (e) => {
        e.preventDefault();
        DownEvent(e);
      }
      const onTouchMove = (e) => {
        e.preventDefault();
        MoveEvent(e)
      }
      const onTouchUp = (e) => {
        e.preventDefault();
        UpEvent()
      }

      const onWheelEvent = (e) => {
        const {deltaX, deltaY} = e
        setPanOffset(prev => ({x:prev.x - deltaX, y:prev.y - deltaY}))

      }

      //adding event listeners for mouse actions
      canvas.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
      canvas.addEventListener('mousedown', onMouseDown)
      document.addEventListener("wheel", onWheelEvent);

      canvas.addEventListener('touchmove', onTouchMove)
      document.addEventListener('touchend', onTouchUp)
      canvas.addEventListener('touchstart', onTouchDown)

      return() => {
        // clearing event listeners
        canvas.removeEventListener('mousedown', onMouseDown)
        canvas.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
        document.removeEventListener("wheel", onWheelEvent);

        canvas.removeEventListener('touchstart', onTouchDown)
        canvas.removeEventListener('touchmove', onTouchMove)
        document.removeEventListener('touchend', onTouchUp)
        
      }

    },[panOffset,elements,currentTool,action,scale])

  return (
    <div className='flex justify-center '>
    <canvas ref = {canvasRef} height={window.innerHeight} width={window.innerWidth} 
    className={` border-2 border-[#F2F2F2] m-0 ${currentTool === 'eraser' ? "cursor-cell" : currentTool === 'pan' ? 'cursor-grab' : "cursor-crosshair"}`} id='canvas'></canvas>
    </div>
  )
}

export default DrawingArea