(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

},{}],2:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

(function () {
  try {
    cachedSetTimeout = setTimeout;
  } catch (e) {
    cachedSetTimeout = function () {
      throw new Error('setTimeout is not defined');
    }
  }
  try {
    cachedClearTimeout = clearTimeout;
  } catch (e) {
    cachedClearTimeout = function () {
      throw new Error('clearTimeout is not defined');
    }
  }
} ())
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = cachedSetTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    cachedClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        cachedSetTimeout(drainQueue, 0);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],3:[function(require,module,exports){
(function (global){
"use strict";
var ts = (typeof window !== "undefined" ? window['ts'] : typeof global !== "undefined" ? global['ts'] : null);
var types_1 = require('./types');
var MemoryManager = (function () {
    function MemoryManager(typeChecker, typeHelper) {
        this.typeChecker = typeChecker;
        this.typeHelper = typeHelper;
        this.scopes = {};
        this.scopesOfVariables = {};
    }
    MemoryManager.prototype.preprocessVariables = function () {
        for (var k in this.typeHelper.variables) {
            var v = this.typeHelper.variables[k];
            if (v.requiresAllocation)
                this.scheduleNodeDisposal(v.declaration.name);
        }
    };
    MemoryManager.prototype.preprocessTemporaryVariables = function (node) {
        var _this = this;
        switch (node.kind) {
            case ts.SyntaxKind.ArrayLiteralExpression:
                {
                    if (node.parent.kind == ts.SyntaxKind.VariableDeclaration)
                        return;
                    if (node.parent.kind == ts.SyntaxKind.BinaryExpression && node.parent.parent.kind == ts.SyntaxKind.ExpressionStatement) {
                        var binExpr = node.parent;
                        if (binExpr.left.kind == ts.SyntaxKind.Identifier)
                            return;
                    }
                    var type = this.typeHelper.getCType(node);
                    if (type && type instanceof types_1.ArrayType && type.isDynamicArray)
                        this.scheduleNodeDisposal(node);
                }
                break;
            case ts.SyntaxKind.ObjectLiteralExpression:
                {
                    if (node.parent.kind == ts.SyntaxKind.VariableDeclaration)
                        return;
                    if (node.parent.kind == ts.SyntaxKind.BinaryExpression && node.parent.parent.kind == ts.SyntaxKind.ExpressionStatement) {
                        var binExpr = node.parent;
                        if (binExpr.left.kind == ts.SyntaxKind.Identifier)
                            return;
                    }
                    var type = this.typeHelper.getCType(node);
                    if (type && type instanceof types_1.StructType)
                        this.scheduleNodeDisposal(node);
                }
                break;
            case ts.SyntaxKind.BinaryExpression:
                {
                    var binExpr = node;
                    if (binExpr.operatorToken.kind == ts.SyntaxKind.PlusToken) {
                        var leftType = this.typeHelper.getCType(binExpr.left);
                        var rightType = this.typeHelper.getCType(binExpr.right);
                        if (leftType == types_1.StringVarType || rightType == types_1.StringVarType)
                            this.scheduleNodeDisposal(binExpr);
                        if (binExpr.left.kind == ts.SyntaxKind.BinaryExpression)
                            this.preprocessTemporaryVariables(binExpr.left);
                        if (binExpr.right.kind == ts.SyntaxKind.BinaryExpression)
                            this.preprocessTemporaryVariables(binExpr.right);
                        return;
                    }
                }
                break;
        }
        node.getChildren().forEach(function (c) { return _this.preprocessTemporaryVariables(c); });
    };
    MemoryManager.prototype.getGCVariablesForScope = function (node) {
        var parentDecl = this.findParentFunctionNode(node);
        var scopeId = parentDecl && parentDecl.pos + 1 + "" || "main";
        var realScopeId = this.scopes[scopeId] && this.scopes[scopeId].length && this.scopes[scopeId][0].scopeId;
        var gcVars = [];
        if (this.scopes[scopeId] && this.scopes[scopeId].filter(function (v) { return !v.simple && !v.array && !v.dict; }).length) {
            gcVars.push("gc_" + realScopeId);
        }
        if (this.scopes[scopeId] && this.scopes[scopeId].filter(function (v) { return !v.simple && v.array; }).length) {
            gcVars.push("gc_" + realScopeId + "_arrays");
        }
        if (this.scopes[scopeId] && this.scopes[scopeId].filter(function (v) { return !v.simple && v.dict; }).length) {
            gcVars.push("gc_" + realScopeId + "_dicts");
        }
        return gcVars;
    };
    MemoryManager.prototype.getGCVariableForNode = function (node) {
        var parentDecl = this.findParentFunctionNode(node);
        var key = node.pos + "_" + node.end;
        if (this.scopesOfVariables[key] && !this.scopesOfVariables[key].simple) {
            if (this.scopesOfVariables[key].array)
                return "gc_" + this.scopesOfVariables[key].scopeId + "_arrays";
            else if (this.scopesOfVariables[key].dict)
                return "gc_" + this.scopesOfVariables[key].scopeId + "_dicts";
            else
                return "gc_" + this.scopesOfVariables[key].scopeId;
        }
        else
            return null;
    };
    MemoryManager.prototype.getDestructorsForScope = function (node) {
        var parentDecl = this.findParentFunctionNode(node);
        var scopeId = parentDecl && parentDecl.pos + 1 || "main";
        var destructors = [];
        if (this.scopes[scopeId]) {
            for (var _i = 0, _a = this.scopes[scopeId].filter(function (v) { return v.simple; }); _i < _a.length; _i++) {
                var simpleVarScopeInfo = _a[_i];
                destructors.push({ node: simpleVarScopeInfo.node, varName: simpleVarScopeInfo.varName });
            }
        }
        return destructors;
    };
    MemoryManager.prototype.getReservedTemporaryVarName = function (node) {
        if (this.scopesOfVariables[node.pos + "_" + node.end])
            return this.scopesOfVariables[node.pos + "_" + node.end].varName;
        else
            return null;
    };
    MemoryManager.prototype.scheduleNodeDisposal = function (heapNode) {
        var varFuncNode = this.findParentFunctionNode(heapNode);
        var topScope = varFuncNode && varFuncNode.pos + 1 || "main";
        var isSimple = true;
        if (this.isInsideLoop(heapNode))
            isSimple = false;
        var scopeTree = {};
        scopeTree[topScope] = true;
        // TODO:
        // - circular references
        var queue = [heapNode];
        queue.push();
        while (queue.length > 0) {
            var node = queue.shift();
            var refs = [node];
            if (node.kind == ts.SyntaxKind.Identifier) {
                var varIdent = node;
                var nodeVarInfo = this.typeHelper.getVariableInfo(varIdent);
                if (!nodeVarInfo) {
                    console.log("WARNING: Cannot find references for " + node.getText());
                    continue;
                }
                refs = this.typeHelper.getVariableInfo(varIdent).references;
            }
            var returned = false;
            for (var _i = 0, refs_1 = refs; _i < refs_1.length; _i++) {
                var ref = refs_1[_i];
                var parentNode = this.findParentFunctionNode(ref);
                if (!parentNode)
                    topScope = "main";
                if (ref.parent && ref.parent.kind == ts.SyntaxKind.BinaryExpression) {
                    var binaryExpr = ref.parent;
                    if (binaryExpr.operatorToken.kind == ts.SyntaxKind.EqualsToken && binaryExpr.left.getText() == heapNode.getText()) {
                        console.log(heapNode.getText() + " -> Detected assignment: " + binaryExpr.getText() + ".");
                        isSimple = false;
                    }
                }
                if (ref.parent && ref.parent.kind == ts.SyntaxKind.CallExpression) {
                    var call = ref.parent;
                    if (call.expression.kind == ts.SyntaxKind.Identifier && call.expression.pos == ref.pos) {
                        console.log(heapNode.getText() + " -> Found function call!");
                        if (topScope !== "main") {
                            var funcNode = this.findParentFunctionNode(call);
                            topScope = funcNode && funcNode.pos + 1 || "main";
                            var targetScope = node.parent.pos + 1 + "";
                            isSimple = false;
                            if (scopeTree[targetScope])
                                delete scopeTree[targetScope];
                            scopeTree[topScope] = targetScope;
                        }
                        this.addIfFoundInAssignment(heapNode, call, queue);
                    }
                    else {
                        var symbol = this.typeChecker.getSymbolAtLocation(call.expression);
                        if (!symbol) {
                            if (call.expression.getText() != "console.log") {
                                var isPush = false;
                                if (call.expression.kind == ts.SyntaxKind.PropertyAccessExpression) {
                                    var propAccess = call.expression;
                                    var type_1 = this.typeHelper.getCType(propAccess.expression);
                                    if (type_1 && (type_1 instanceof types_1.ArrayType) && propAccess.name.getText() == "push") {
                                        isPush = true;
                                        console.log(heapNode.getText() + " is pushed to array '" + propAccess.expression.getText() + "'.");
                                        queue.push(propAccess.expression);
                                    }
                                }
                                if (!isPush) {
                                    console.log(heapNode.getText() + " -> Detected passing to external function " + call.expression.getText() + ". Scope changed to main.");
                                    topScope = "main";
                                    isSimple = false;
                                }
                            }
                        }
                        else {
                            var funcDecl = symbol.valueDeclaration;
                            for (var i = 0; i < call.arguments.length; i++) {
                                if (call.arguments[i].kind == ts.SyntaxKind.Identifier && call.arguments[i].getText() == node.getText()) {
                                    console.log(heapNode.getText() + " -> Found passing to function " + call.expression.getText() + " as parameter " + funcDecl.parameters[i].name.getText());
                                    queue.push(funcDecl.parameters[i].name);
                                    isSimple = false;
                                }
                            }
                        }
                    }
                }
                else if (ref.parent && ref.parent.kind == ts.SyntaxKind.ReturnStatement && !returned) {
                    returned = true;
                    queue.push(parentNode.name);
                    console.log(heapNode.getText() + " -> Found variable returned from the function!");
                    isSimple = false;
                }
                else
                    this.addIfFoundInAssignment(heapNode, ref, queue);
            }
        }
        var type = this.typeHelper.getCType(heapNode);
        var varName;
        if (heapNode.kind == ts.SyntaxKind.ArrayLiteralExpression)
            varName = this.typeHelper.addNewTemporaryVariable(heapNode, "tmp_array");
        else if (heapNode.kind == ts.SyntaxKind.ObjectLiteralExpression)
            varName = this.typeHelper.addNewTemporaryVariable(heapNode, "tmp_obj");
        else if (heapNode.kind == ts.SyntaxKind.BinaryExpression)
            varName = this.typeHelper.addNewTemporaryVariable(heapNode, "tmp_string");
        else
            varName = heapNode.getText();
        var foundScopes = topScope == "main" ? [topScope] : Object.keys(scopeTree);
        var scopeInfo = {
            node: heapNode,
            simple: isSimple,
            array: type && type instanceof types_1.ArrayType && type.isDynamicArray,
            dict: type && type instanceof types_1.DictType,
            varName: varName,
            scopeId: foundScopes.join("_")
        };
        this.scopesOfVariables[heapNode.pos + "_" + heapNode.end] = scopeInfo;
        for (var _a = 0, foundScopes_1 = foundScopes; _a < foundScopes_1.length; _a++) {
            var sc = foundScopes_1[_a];
            this.scopes[sc] = this.scopes[sc] || [];
            this.scopes[sc].push(scopeInfo);
        }
    };
    MemoryManager.prototype.addIfFoundInAssignment = function (varIdent, ref, queue) {
        if (ref.parent && ref.parent.kind == ts.SyntaxKind.VariableDeclaration) {
            var varDecl = ref.parent;
            if (varDecl.initializer && varDecl.initializer.pos == ref.pos) {
                queue.push(varDecl.name);
                console.log(varIdent.getText() + " -> Found initializer-assignment to variable " + varDecl.name.getText());
                return true;
            }
        }
        else if (ref.parent && ref.parent.kind == ts.SyntaxKind.BinaryExpression) {
            var binaryExpr = ref.parent;
            if (binaryExpr.operatorToken.kind == ts.SyntaxKind.FirstAssignment && binaryExpr.right.pos == ref.pos) {
                queue.push(binaryExpr.left);
                console.log(varIdent.getText() + " -> Found assignment to variable " + binaryExpr.left.getText());
                return true;
            }
        }
        return false;
    };
    MemoryManager.prototype.findParentFunctionNode = function (node) {
        var parent = node;
        while (parent && parent.kind != ts.SyntaxKind.FunctionDeclaration) {
            parent = parent.parent;
        }
        return parent;
    };
    MemoryManager.prototype.isInsideLoop = function (node) {
        var parent = node;
        while (parent
            && parent.kind != ts.SyntaxKind.ForInStatement
            && parent.kind != ts.SyntaxKind.ForOfStatement
            && parent.kind != ts.SyntaxKind.ForStatement
            && parent.kind != ts.SyntaxKind.WhileStatement
            && parent.kind != ts.SyntaxKind.DoStatement) {
            parent = parent.parent;
        }
        return !!parent;
    };
    MemoryManager.prototype.getSymbolId = function (node) {
        return this.typeChecker.getSymbolAtLocation(node)["id"];
    };
    return MemoryManager;
}());
exports.MemoryManager = MemoryManager;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./types":13}],4:[function(require,module,exports){
(function (global){
"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var ts = (typeof window !== "undefined" ? window['ts'] : typeof global !== "undefined" ? global['ts'] : null);
var template_1 = require('../template');
var types_1 = require('../types');
var elementaccess_1 = require('./elementaccess');
var AssignmentHelper = (function () {
    function AssignmentHelper() {
    }
    AssignmentHelper.create = function (scope, left, right) {
        var accessor;
        var varType;
        var argumentExpression;
        if (left.kind == ts.SyntaxKind.ElementAccessExpression) {
            var elemAccess = left;
            varType = scope.root.typeHelper.getCType(elemAccess.expression);
            if (elemAccess.expression.kind == ts.SyntaxKind.Identifier)
                accessor = elemAccess.expression.getText();
            else
                accessor = new elementaccess_1.CElementAccess(scope, elemAccess.expression);
            if (varType instanceof types_1.StructType && elemAccess.argumentExpression.kind == ts.SyntaxKind.StringLiteral) {
                var ident = elemAccess.argumentExpression.getText().slice(1, -1);
                if (ident.search(/^[_A-Za-z][_A-Za-z0-9]*$/) > -1)
                    argumentExpression = ident;
                else
                    argumentExpression = template_1.CodeTemplateFactory.createForNode(scope, elemAccess.argumentExpression);
            }
            else
                argumentExpression = template_1.CodeTemplateFactory.createForNode(scope, elemAccess.argumentExpression);
        }
        else {
            varType = scope.root.typeHelper.getCType(left);
            accessor = new elementaccess_1.CElementAccess(scope, left);
            argumentExpression = null;
        }
        return new CAssignment(scope, accessor, argumentExpression, varType, right);
    };
    return AssignmentHelper;
}());
exports.AssignmentHelper = AssignmentHelper;
var CAssignment = (function () {
    function CAssignment(scope, accessor, argumentExpression, type, right) {
        this.accessor = accessor;
        this.argumentExpression = argumentExpression;
        this.allocator = '';
        this.isObjLiteralAssignment = false;
        this.isArrayLiteralAssignment = false;
        this.isDynamicArray = false;
        this.isStaticArray = false;
        this.isStruct = false;
        this.isDict = false;
        this.isSimpleVar = typeof type === 'string';
        this.isDynamicArray = type instanceof types_1.ArrayType && type.isDynamicArray;
        this.isStaticArray = type instanceof types_1.ArrayType && !type.isDynamicArray;
        this.isDict = type instanceof types_1.DictType;
        this.isStruct = type instanceof types_1.StructType;
        this.nodeText = right.getText();
        var argType = type;
        var argAccessor = accessor;
        if (argumentExpression) {
            if (type instanceof types_1.StructType && typeof argumentExpression === 'string')
                argType = type.properties[argumentExpression];
            else if (type instanceof types_1.ArrayType)
                argType = type.elementType;
            argAccessor = new elementaccess_1.CSimpleElementAccess(scope, type, accessor, argumentExpression);
        }
        var isTempVar = !!scope.root.memoryManager.getReservedTemporaryVarName(right);
        if (right.kind == ts.SyntaxKind.ObjectLiteralExpression && !isTempVar) {
            this.isObjLiteralAssignment = true;
            var objLiteral = right;
            this.objInitializers = objLiteral.properties
                .filter(function (p) { return p.kind == ts.SyntaxKind.PropertyAssignment; })
                .map(function (p) { return p; })
                .map(function (p) { return new CAssignment(scope, argAccessor, p.name.getText(), argType, p.initializer); });
        }
        else if (right.kind == ts.SyntaxKind.ArrayLiteralExpression && !isTempVar) {
            this.isArrayLiteralAssignment = true;
            var arrLiteral = right;
            this.arrayLiteralSize = arrLiteral.elements.length;
            this.arrInitializers = arrLiteral.elements.map(function (e, i) { return new CAssignment(scope, argAccessor, "" + i, argType, e); });
        }
        else
            this.expression = template_1.CodeTemplateFactory.createForNode(scope, right);
    }
    CAssignment = __decorate([
        template_1.CodeTemplate("\n{allocator}\n{#if isObjLiteralAssignment}\n    {objInitializers}\n{#elseif isArrayLiteralAssignment}\n    {arrInitializers}\n{#elseif isDynamicArray && argumentExpression == null}\n    {accessor} = ((void *){expression});\n\n{#elseif argumentExpression == null}\n    {accessor} = {expression};\n\n{#elseif isStruct}\n    {accessor}->{argumentExpression} = {expression};\n\n{#elseif isDict}\n    DICT_SET({accessor}, {argumentExpression}, {expression});\n\n{#elseif isDynamicArray}\n    {accessor}->data[{argumentExpression}] = {expression};\n\n{#elseif isStaticArray}\n    {accessor}[{argumentExpression}] = {expression};\n\n{#else}\n    /* Unsupported assignment {accessor}[{argumentExpression}] = {nodeText} */;\n\n{/if}")
    ], CAssignment);
    return CAssignment;
}());
exports.CAssignment = CAssignment;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../template":12,"../types":13,"./elementaccess":5}],5:[function(require,module,exports){
(function (global){
"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var ts = (typeof window !== "undefined" ? window['ts'] : typeof global !== "undefined" ? global['ts'] : null);
var template_1 = require('../template');
var types_1 = require('../types');
var CElementAccess = (function () {
    function CElementAccess(scope, node) {
        var type = null;
        var elementAccess = null;
        var argumentExpression = null;
        if (node.kind == ts.SyntaxKind.Identifier) {
            type = scope.root.typeHelper.getCType(node);
            elementAccess = node.getText();
        }
        else if (node.kind == ts.SyntaxKind.PropertyAccessExpression) {
            var propAccess = node;
            type = scope.root.typeHelper.getCType(propAccess.expression);
            if (propAccess.expression.kind == ts.SyntaxKind.Identifier)
                elementAccess = propAccess.expression.getText();
            else
                elementAccess = new CElementAccess(scope, propAccess.expression);
            argumentExpression = propAccess.name.getText();
        }
        else if (node.kind == ts.SyntaxKind.ElementAccessExpression) {
            var elemAccess = node;
            type = scope.root.typeHelper.getCType(elemAccess.expression);
            if (elemAccess.expression.kind == ts.SyntaxKind.Identifier)
                elementAccess = elemAccess.expression.getText();
            else
                elementAccess = new CElementAccess(scope, elemAccess.expression);
            if (type instanceof types_1.StructType && elemAccess.argumentExpression.kind == ts.SyntaxKind.StringLiteral) {
                var ident = elemAccess.argumentExpression.getText().slice(1, -1);
                if (ident.search(/^[_A-Za-z][_A-Za-z0-9]*$/) > -1)
                    argumentExpression = ident;
                else
                    argumentExpression = template_1.CodeTemplateFactory.createForNode(scope, elemAccess.argumentExpression);
            }
            else
                argumentExpression = template_1.CodeTemplateFactory.createForNode(scope, elemAccess.argumentExpression);
        }
        this.simpleAccessor = new CSimpleElementAccess(scope, type, elementAccess, argumentExpression);
    }
    CElementAccess = __decorate([
        template_1.CodeTemplate("{simpleAccessor}", [ts.SyntaxKind.ElementAccessExpression, ts.SyntaxKind.PropertyAccessExpression, ts.SyntaxKind.Identifier])
    ], CElementAccess);
    return CElementAccess;
}());
exports.CElementAccess = CElementAccess;
var CSimpleElementAccess = (function () {
    function CSimpleElementAccess(scope, type, elementAccess, argumentExpression) {
        this.elementAccess = elementAccess;
        this.argumentExpression = argumentExpression;
        this.isDynamicArray = false;
        this.isStaticArray = false;
        this.isStruct = false;
        this.isDict = false;
        this.isString = false;
        this.isSimpleVar = typeof type === 'string' && type != types_1.UniversalVarType && type != types_1.PointerVarType;
        this.isDynamicArray = type instanceof types_1.ArrayType && type.isDynamicArray;
        this.isStaticArray = type instanceof types_1.ArrayType && !type.isDynamicArray;
        this.arrayCapacity = type instanceof types_1.ArrayType && !type.isDynamicArray && type.capacity + "";
        this.isDict = type instanceof types_1.DictType;
        this.isStruct = type instanceof types_1.StructType;
        this.isString = type === types_1.StringVarType;
        if (this.isString && this.argumentExpression == "length")
            scope.root.headerFlags.str_len = true;
    }
    CSimpleElementAccess = __decorate([
        template_1.CodeTemplate("\n{#if isString && argumentExpression == 'length'}\n    str_len({elementAccess})\n{#elseif isSimpleVar || argumentExpression == null}\n    {elementAccess}\n{#elseif isDynamicArray && argumentExpression == 'length'}\n    {elementAccess}->size\n{#elseif isDynamicArray}\n    {elementAccess}->data[{argumentExpression}]\n{#elseif isStaticArray && argumentExpression == 'length'}\n    {arrayCapacity}\n{#elseif isStaticArray}\n    {elementAccess}[{argumentExpression}]\n{#elseif isStruct}\n    {elementAccess}->{argumentExpression}\n{#elseif isDict}\n    DICT_GET({elementAccess}, {argumentExpression})\n{#else}\n    /* Unsupported element access scenario: {elementAccess} {argumentExpression} */\n{/if}")
    ], CSimpleElementAccess);
    return CSimpleElementAccess;
}());
exports.CSimpleElementAccess = CSimpleElementAccess;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../template":12,"../types":13}],6:[function(require,module,exports){
(function (global){
"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var ts = (typeof window !== "undefined" ? window['ts'] : typeof global !== "undefined" ? global['ts'] : null);
var template_1 = require('../template');
var types_1 = require('../types');
var assignment_1 = require('./assignment');
var printf_1 = require('./printf');
var variable_1 = require('./variable');
var elementaccess_1 = require('./elementaccess');
var CCallExpression = (function () {
    function CCallExpression(scope, call) {
        this.propName = null;
        this.tempVarName = '';
        this.staticArraySize = '';
        this.printfCalls = [];
        this.funcName = call.expression.getText();
        this.topExpressionOfStatement = call.parent.kind == ts.SyntaxKind.ExpressionStatement;
        if (this.funcName != "console.log") {
            this.arguments = call.arguments.map(function (a) { return template_1.CodeTemplateFactory.createForNode(scope, a); });
            this.arg1 = this.arguments[0];
            this.arg2 = this.arguments[1];
        }
        if (call.expression.kind == ts.SyntaxKind.PropertyAccessExpression) {
            var propAccess = call.expression;
            this.propName = propAccess.name.getText();
            this.varAccess = new elementaccess_1.CElementAccess(scope, propAccess.expression);
            if (this.funcName == "console.log") {
                for (var i = 0; i < call.arguments.length; i++) {
                    this.printfCalls.push(printf_1.PrintfHelper.create(scope, call.arguments[i], i == call.arguments.length - 1));
                }
                scope.root.headerFlags.printf = true;
            }
            else if (propAccess.name.getText() == 'push' && this.arguments.length == 1) {
                if (!this.topExpressionOfStatement) {
                    this.tempVarName = scope.root.typeHelper.addNewTemporaryVariable(propAccess, "arr_size");
                    scope.variables.push(new variable_1.CVariable(scope, this.tempVarName, types_1.NumberVarType));
                }
                scope.root.headerFlags.array = true;
            }
            else if (propAccess.name.getText() == 'pop' && this.arguments.length == 0) {
                scope.root.headerFlags.array = true;
                scope.root.headerFlags.array_pop = true;
            }
            else if (propAccess.name.getText() == 'indexOf' && this.arguments.length == 1) {
                var type = scope.root.typeHelper.getCType(propAccess.expression);
                if (type == types_1.StringVarType) {
                    this.funcName = "str_pos";
                    scope.root.headerFlags.str_pos = true;
                }
                else if (type instanceof types_1.ArrayType) {
                    this.tempVarName = scope.root.typeHelper.addNewTemporaryVariable(propAccess, "arr_pos");
                    this.iteratorVarName = scope.root.typeHelper.addNewIteratorVariable(propAccess);
                    this.staticArraySize = type.isDynamicArray ? '' : type.capacity + "";
                    scope.variables.push(new variable_1.CVariable(scope, this.tempVarName, types_1.NumberVarType));
                    scope.variables.push(new variable_1.CVariable(scope, this.iteratorVarName, types_1.NumberVarType));
                    scope.root.headerFlags.array = true;
                }
            }
        }
    }
    CCallExpression = __decorate([
        template_1.CodeTemplate("\n{#statements}\n    {#if propName == \"push\" && tempVarName}\n        ARRAY_PUSH({varAccess}, {arguments});\n        {tempVarName} = {varAccess}->size;\n    {#elseif propName == \"indexOf\" && tempVarName && staticArraySize}\n        {tempVarName} = -1;\n        for ({iteratorVarName} = 0; {iteratorVarName} < {staticArraySize}; {iteratorVarName}++) {\n            if ({varAccess}[{iteratorVarName}] == {arg1}) {\n                {tempVarName} = {iteratorVarName};\n                break;\n            }\n        }\n    {#elseif propName == \"indexOf\" && tempVarName}\n        {tempVarName} = -1;\n        for ({iteratorVarName} = 0; {iteratorVarName} < {varAccess}->size; {iteratorVarName}++) {\n            if ({varAccess}->data[{iteratorVarName}] == {arg1}) {\n                {tempVarName} = {iteratorVarName};\n                break;\n            }\n        }\n    {/if}\n{/statements}\n{#if propName == \"push\" && arguments.length == 1 && topExpressionOfStatement}\n    ARRAY_PUSH({varAccess}, {arguments})\n{#elseif tempVarName}\n    {tempVarName}\n{#elseif propName == \"indexOf\" && arguments.length == 1}\n    {funcName}({varAccess}, {arg1})\n{#elseif propName == \"pop\" && arguments.length == 0}\n    ARRAY_POP({varAccess})\n{#elseif printfCalls.length == 1}\n    {printfCalls}\n{#elseif printfCalls.length > 1}\n    {\n        {printfCalls {    }=>{this}\n}\n    }\n{#else}\n    {funcName}({arguments {, }=> {this}})\n{/if}", ts.SyntaxKind.CallExpression)
    ], CCallExpression);
    return CCallExpression;
}());
exports.CCallExpression = CCallExpression;
var CBinaryExpression = (function () {
    function CBinaryExpression(scope, node) {
        this.replacedWithCall = false;
        this.replacedWithVar = false;
        this.gcVarName = null;
        this.strPlusStr = false;
        this.strPlusNumber = false;
        this.numberPlusStr = false;
        var operatorMap = {};
        var callReplaceMap = {};
        var leftType = scope.root.typeHelper.getCType(node.left);
        var rightType = scope.root.typeHelper.getCType(node.right);
        this.left = template_1.CodeTemplateFactory.createForNode(scope, node.left);
        this.right = template_1.CodeTemplateFactory.createForNode(scope, node.right);
        operatorMap[ts.SyntaxKind.AmpersandAmpersandToken] = '&&';
        operatorMap[ts.SyntaxKind.BarBarToken] = '||';
        if (leftType == types_1.NumberVarType && rightType == types_1.NumberVarType) {
            operatorMap[ts.SyntaxKind.GreaterThanToken] = '>';
            operatorMap[ts.SyntaxKind.GreaterThanEqualsToken] = '>=';
            operatorMap[ts.SyntaxKind.LessThanToken] = '<';
            operatorMap[ts.SyntaxKind.LessThanEqualsToken] = '<=';
            operatorMap[ts.SyntaxKind.ExclamationEqualsEqualsToken] = '!=';
            operatorMap[ts.SyntaxKind.ExclamationEqualsToken] = '!=';
            operatorMap[ts.SyntaxKind.EqualsEqualsEqualsToken] = '==';
            operatorMap[ts.SyntaxKind.EqualsEqualsToken] = '==';
            operatorMap[ts.SyntaxKind.AsteriskToken] = '*';
            operatorMap[ts.SyntaxKind.SlashToken] = '/';
            operatorMap[ts.SyntaxKind.PlusToken] = '+';
            operatorMap[ts.SyntaxKind.MinusToken] = '-';
        }
        else if (leftType == types_1.StringVarType && rightType == types_1.StringVarType) {
            callReplaceMap[ts.SyntaxKind.ExclamationEqualsEqualsToken] = ['strcmp', ' != 0'];
            callReplaceMap[ts.SyntaxKind.ExclamationEqualsToken] = ['strcmp', ' != 0'];
            callReplaceMap[ts.SyntaxKind.EqualsEqualsEqualsToken] = ['strcmp', ' == 0'];
            callReplaceMap[ts.SyntaxKind.EqualsEqualsToken] = ['strcmp', ' == 0'];
            if (callReplaceMap[node.operatorToken.kind])
                scope.root.headerFlags.strings = true;
            if (node.operatorToken.kind == ts.SyntaxKind.PlusToken) {
                var tempVarName = scope.root.memoryManager.getReservedTemporaryVarName(node);
                scope.func.variables.push(new variable_1.CVariable(scope, tempVarName, "char *", { initializer: "NULL" }));
                this.gcVarName = scope.root.memoryManager.getGCVariableForNode(node);
                this.replacedWithVar = true;
                this.replacementVarName = tempVarName;
                this.strPlusStr = true;
                scope.root.headerFlags.strings = true;
                scope.root.headerFlags.malloc = true;
            }
        }
        else if (leftType == types_1.NumberVarType && rightType == types_1.StringVarType
            || leftType == types_1.StringVarType && rightType == types_1.NumberVarType) {
            callReplaceMap[ts.SyntaxKind.ExclamationEqualsEqualsToken] = ['str_int16_t_cmp', ' != 0'];
            callReplaceMap[ts.SyntaxKind.ExclamationEqualsToken] = ['str_int16_t_cmp', ' != 0'];
            callReplaceMap[ts.SyntaxKind.EqualsEqualsEqualsToken] = ['str_int16_t_cmp', ' == 0'];
            callReplaceMap[ts.SyntaxKind.EqualsEqualsToken] = ['str_int16_t_cmp', ' == 0'];
            if (callReplaceMap[node.operatorToken.kind]) {
                scope.root.headerFlags.str_int16_t_cmp = true;
                // str_int16_t_cmp expects certain order of arguments (string, number)
                if (leftType == types_1.NumberVarType) {
                    var tmp = this.left;
                    this.left = this.right;
                    this.right = tmp;
                }
            }
            if (node.operatorToken.kind == ts.SyntaxKind.PlusToken) {
                var tempVarName = scope.root.memoryManager.getReservedTemporaryVarName(node);
                scope.func.variables.push(new variable_1.CVariable(scope, tempVarName, "char *", { initializer: "NULL" }));
                this.gcVarName = scope.root.memoryManager.getGCVariableForNode(node);
                this.replacedWithVar = true;
                this.replacementVarName = tempVarName;
                if (leftType == types_1.NumberVarType)
                    this.numberPlusStr = true;
                else
                    this.strPlusNumber = true;
                scope.root.headerFlags.strings = true;
                scope.root.headerFlags.malloc = true;
                scope.root.headerFlags.str_int16_t_cat = true;
            }
        }
        this.operator = operatorMap[node.operatorToken.kind];
        if (callReplaceMap[node.operatorToken.kind]) {
            this.replacedWithCall = true;
            _a = callReplaceMap[node.operatorToken.kind], this.call = _a[0], this.callCondition = _a[1];
        }
        this.nodeText = node.getText();
        if (this.gcVarName) {
            scope.root.headerFlags.gc_iterator = true;
            scope.root.headerFlags.array = true;
        }
        var _a;
    }
    CBinaryExpression = __decorate([
        template_1.CodeTemplate("\n{#statements}\n    {#if replacedWithVar && strPlusStr}\n        {replacementVarName} = malloc(strlen({left}) + strlen({right}) + 1);\n        assert({replacementVarName} != NULL);\n        strcpy({replacementVarName}, {left});\n        strcat({replacementVarName}, {right});\n    {#elseif replacedWithVar && strPlusNumber}\n        {replacementVarName} = malloc(strlen({left}) + STR_INT16_T_BUFLEN + 1);\n        assert({replacementVarName} != NULL);\n        {replacementVarName}[0] = '\\0';\n        strcat({replacementVarName}, {left});\n        str_int16_t_cat({replacementVarName}, {right});\n    {#elseif replacedWithVar && numberPlusStr}\n        {replacementVarName} = malloc(strlen({right}) + STR_INT16_T_BUFLEN + 1);\n        assert({replacementVarName} != NULL);\n        {replacementVarName}[0] = '\\0';\n        str_int16_t_cat({replacementVarName}, {left});\n        strcat({replacementVarName}, {right});\n    {/if}\n    {#if replacedWithVar && gcVarName}\n        ARRAY_PUSH({gcVarName}, {replacementVarName});\n    {/if}\n\n{/statements}\n{#if operator}\n    {left} {operator} {right}\n{#elseif replacedWithCall}\n    {call}({left}, {right}){callCondition}\n{#elseif replacedWithVar}\n    {replacementVarName}\n{#else}\n    /* unsupported expression {nodeText} */\n{/if}", ts.SyntaxKind.BinaryExpression)
    ], CBinaryExpression);
    return CBinaryExpression;
}());
var CUnaryExpression = (function () {
    function CUnaryExpression(scope, node) {
        this.replacedWithCall = false;
        var operatorMap = {};
        var callReplaceMap = {};
        var type = scope.root.typeHelper.getCType(node.operand);
        if (type == types_1.NumberVarType) {
            operatorMap[ts.SyntaxKind.PlusPlusToken] = '++';
            operatorMap[ts.SyntaxKind.MinusMinusToken] = '--';
            operatorMap[ts.SyntaxKind.MinusToken] = '-';
            operatorMap[ts.SyntaxKind.ExclamationToken] = '!';
            callReplaceMap[ts.SyntaxKind.PlusToken] = ["atoi", ""];
            if (callReplaceMap[node.operator])
                scope.root.headerFlags.atoi = true;
        }
        this.operator = operatorMap[node.operator];
        if (callReplaceMap[node.operator]) {
            this.replacedWithCall = true;
            _a = callReplaceMap[node.operator], this.call = _a[0], this.callCondition = _a[1];
        }
        this.operand = template_1.CodeTemplateFactory.createForNode(scope, node.operand);
        this.isPostfix = node.kind == ts.SyntaxKind.PostfixUnaryExpression;
        this.nodeText = node.getText();
        var _a;
    }
    CUnaryExpression = __decorate([
        template_1.CodeTemplate("\n{#if isPostfix && operator}\n    {operand}{operator}\n{#elseif !isPostfix && operator}\n    {operator}{operand}\n{#elseif replacedWithCall}\n    {call}({operand}){callCondition}\n{#else}\n    /* unsupported expression {nodeText} */\n{/if}", [ts.SyntaxKind.PrefixUnaryExpression, ts.SyntaxKind.PostfixUnaryExpression])
    ], CUnaryExpression);
    return CUnaryExpression;
}());
var CTernaryExpression = (function () {
    function CTernaryExpression(scope, node) {
        this.condition = template_1.CodeTemplateFactory.createForNode(scope, node.condition);
        this.whenTrue = template_1.CodeTemplateFactory.createForNode(scope, node.whenTrue);
        this.whenFalse = template_1.CodeTemplateFactory.createForNode(scope, node.whenFalse);
    }
    CTernaryExpression = __decorate([
        template_1.CodeTemplate("{condition} ? {whenTrue} : {whenFalse}", ts.SyntaxKind.ConditionalExpression)
    ], CTernaryExpression);
    return CTernaryExpression;
}());
var CGroupingExpression = (function () {
    function CGroupingExpression(scope, node) {
        this.expression = template_1.CodeTemplateFactory.createForNode(scope, node.expression);
    }
    CGroupingExpression = __decorate([
        template_1.CodeTemplate("({expression})", ts.SyntaxKind.ParenthesizedExpression)
    ], CGroupingExpression);
    return CGroupingExpression;
}());
var CArrayLiteralExpression = (function () {
    function CArrayLiteralExpression(scope, node) {
        var arrSize = node.elements.length;
        if (arrSize == 0) {
            this.expression = "/* Empty array is not supported inside expressions */";
            return;
        }
        var type = scope.root.typeHelper.getCType(node);
        if (type instanceof types_1.ArrayType) {
            var varName = void 0;
            var canUseInitializerList = node.elements.every(function (e) { return e.kind == ts.SyntaxKind.NumericLiteral || e.kind == ts.SyntaxKind.StringLiteral; });
            if (!type.isDynamicArray && canUseInitializerList) {
                varName = scope.root.typeHelper.addNewTemporaryVariable(node, "tmp_array");
                var s = "{ ";
                for (var i = 0; i < arrSize; i++) {
                    if (i != 0)
                        s += ", ";
                    var cExpr = template_1.CodeTemplateFactory.createForNode(scope, node.elements[i]);
                    s += typeof cExpr === 'string' ? cExpr : cExpr.resolve();
                }
                s += " }";
                scope.variables.push(new variable_1.CVariable(scope, varName, type, { initializer: s }));
            }
            else {
                if (type.isDynamicArray) {
                    varName = scope.root.memoryManager.getReservedTemporaryVarName(node);
                    scope.func.variables.push(new variable_1.CVariable(scope, varName, type, { initializer: "NULL" }));
                    scope.root.headerFlags.array = true;
                    scope.statements.push("ARRAY_CREATE(" + varName + ", " + arrSize + ", " + arrSize + ");\n");
                    var gcVarName = scope.root.memoryManager.getGCVariableForNode(node);
                    if (gcVarName) {
                        scope.statements.push("ARRAY_PUSH(" + gcVarName + ", (void *)" + varName + ");\n");
                        scope.root.headerFlags.gc_iterator = true;
                        scope.root.headerFlags.array = true;
                    }
                }
                else {
                    varName = scope.root.typeHelper.addNewTemporaryVariable(node, "tmp_array");
                    scope.variables.push(new variable_1.CVariable(scope, varName, type));
                }
                for (var i = 0; i < arrSize; i++) {
                    var assignment = new assignment_1.CAssignment(scope, varName, i + "", type, node.elements[i]);
                    scope.statements.push(assignment);
                }
            }
            this.expression = type.isDynamicArray ? "((void *)" + varName + ")" : varName;
        }
        else
            this.expression = "/* Unsupported use of array literal expression */";
    }
    CArrayLiteralExpression = __decorate([
        template_1.CodeTemplate("{expression}", ts.SyntaxKind.ArrayLiteralExpression)
    ], CArrayLiteralExpression);
    return CArrayLiteralExpression;
}());
var CObjectLiteralExpression = (function () {
    function CObjectLiteralExpression(scope, node) {
        var _this = this;
        this.expression = '';
        this.varName = '';
        this.initializers = [];
        if (node.properties.length == 0)
            return;
        var type = scope.root.typeHelper.getCType(node);
        if (type instanceof types_1.StructType) {
            this.varName = scope.root.memoryManager.getReservedTemporaryVarName(node);
            scope.func.variables.push(new variable_1.CVariable(scope, this.varName, type, { initializer: "NULL" }));
            this.initializers = node.properties
                .filter(function (p) { return p.kind == ts.SyntaxKind.PropertyAssignment; })
                .map(function (p) { return p; })
                .map(function (p) { return new assignment_1.CAssignment(scope, _this.varName, p.name.getText(), type, p.initializer); });
            this.expression = this.varName;
        }
        else
            this.expression = "/* Unsupported use of object literal expression */";
    }
    CObjectLiteralExpression = __decorate([
        template_1.CodeTemplate("\n{#statements}\n    {#if varName}\n        {varName} = malloc(sizeof(*{varName}));\n        assert({varName} != NULL);\n        {initializers}\n    {/if}\n{/statements}\n{expression}", ts.SyntaxKind.ObjectLiteralExpression)
    ], CObjectLiteralExpression);
    return CObjectLiteralExpression;
}());
var CString = (function () {
    function CString(scope, value) {
        var s = typeof value === 'string' ? '"' + value + '"' : value.getText();
        s = s.replace(/\\u([A-Fa-f0-9]{4})/g, function (match, g1) { return String.fromCharCode(parseInt(g1, 16)); });
        if (s.indexOf("'") == 0)
            this.value = '"' + s.replace(/"/g, '\\"').replace(/([^\\])\\'/g, "$1'").slice(1, -1) + '"';
        else
            this.value = s;
    }
    CString = __decorate([
        template_1.CodeTemplate("{value}", ts.SyntaxKind.StringLiteral)
    ], CString);
    return CString;
}());
exports.CString = CString;
var CNumber = (function () {
    function CNumber(scope, value) {
        this.value = value.getText();
    }
    CNumber = __decorate([
        template_1.CodeTemplate("{value}", [ts.SyntaxKind.NumericLiteral])
    ], CNumber);
    return CNumber;
}());
exports.CNumber = CNumber;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../template":12,"../types":13,"./assignment":4,"./elementaccess":5,"./printf":8,"./variable":10}],7:[function(require,module,exports){
(function (global){
"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var ts = (typeof window !== "undefined" ? window['ts'] : typeof global !== "undefined" ? global['ts'] : null);
var template_1 = require('../template');
var types_1 = require('../types');
var variable_1 = require('./variable');
var CFunction = (function () {
    function CFunction(root, funcDecl) {
        var _this = this;
        this.root = root;
        this.func = this;
        this.parameters = [];
        this.variables = [];
        this.statements = [];
        this.parent = root;
        var signature = root.typeChecker.getSignatureFromDeclaration(funcDecl);
        this.name = funcDecl.name.getText();
        this.returnType = root.typeHelper.getTypeString(signature.getReturnType());
        this.parameters = signature.parameters.map(function (p) { return new variable_1.CVariable(_this, p.name, p, { removeStorageSpecifier: true }); });
        this.variables = [];
        this.gcVarNames = root.memoryManager.getGCVariablesForScope(funcDecl);
        var _loop_1 = function(gcVarName) {
            if (root.variables.filter(function (v) { return v.name == gcVarName; }).length)
                return "continue";
            var pointerType = new types_1.ArrayType("void *", 0, true);
            if (gcVarName.indexOf("arrays") == -1)
                root.variables.push(new variable_1.CVariable(root, gcVarName, pointerType));
            else
                root.variables.push(new variable_1.CVariable(root, gcVarName, new types_1.ArrayType(pointerType, 0, true)));
        };
        for (var _i = 0, _a = this.gcVarNames; _i < _a.length; _i++) {
            var gcVarName = _a[_i];
            var state_1 = _loop_1(gcVarName);
            if (state_1 === "continue") continue;
        }
        funcDecl.body.statements.forEach(function (s) { return _this.statements.push(template_1.CodeTemplateFactory.createForNode(_this, s)); });
        if (funcDecl.body.statements[funcDecl.body.statements.length - 1].kind != ts.SyntaxKind.ReturnStatement) {
            this.destructors = new variable_1.CVariableDestructors(this, funcDecl);
        }
    }
    CFunction = __decorate([
        template_1.CodeTemplate("\n{returnType} {name}({parameters {, }=> {this}})\n{\n    {variables  {    }=> {this};\n}\n    {gcVarNames {    }=> ARRAY_CREATE({this}, 2, 0);\n}\n\n    {statements {    }=> {this}}\n\n    {destructors}\n}", ts.SyntaxKind.FunctionDeclaration)
    ], CFunction);
    return CFunction;
}());
exports.CFunction = CFunction;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../template":12,"../types":13,"./variable":10}],8:[function(require,module,exports){
(function (global){
"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var ts = (typeof window !== "undefined" ? window['ts'] : typeof global !== "undefined" ? global['ts'] : null);
var template_1 = require('../template');
var types_1 = require('../types');
var variable_1 = require('./variable');
var PrintfHelper = (function () {
    function PrintfHelper() {
    }
    PrintfHelper.create = function (scope, printNode, emitCR) {
        if (emitCR === void 0) { emitCR = true; }
        var type = scope.root.typeHelper.getCType(printNode);
        var nodeExpression = template_1.CodeTemplateFactory.createForNode(scope, printNode);
        var accessor = nodeExpression["resolve"] ? nodeExpression["resolve"]() : nodeExpression;
        var options = {
            emitCR: emitCR
        };
        return new CPrintf(scope, printNode, accessor, type, options);
    };
    return PrintfHelper;
}());
exports.PrintfHelper = PrintfHelper;
var CPrintf = (function () {
    function CPrintf(scope, printNode, accessor, varType, options) {
        this.accessor = accessor;
        this.isStringLiteral = false;
        this.isQuotedCString = false;
        this.isCString = false;
        this.isInteger = false;
        this.isBoolean = false;
        this.isDict = false;
        this.isStruct = false;
        this.isArray = false;
        this.elementPrintfs = [];
        this.propPrefix = '';
        this.CR = '';
        this.INDENT = '';
        this.isStringLiteral = varType == types_1.StringVarType && printNode.kind == ts.SyntaxKind.StringLiteral;
        this.isQuotedCString = varType == types_1.StringVarType && options.quotedString;
        this.isCString = varType == types_1.StringVarType && !options.quotedString;
        this.isInteger = varType == types_1.NumberVarType;
        this.isBoolean = varType == types_1.BooleanVarType;
        if (this.isStringLiteral)
            this.accessor = this.accessor.slice(1, -1);
        if (options.emitCR)
            this.CR = "\\n";
        if (options.propName)
            this.propPrefix = options.propName + ": ";
        if (options.indent)
            this.INDENT = options.indent;
        if (varType instanceof types_1.ArrayType) {
            this.isArray = true;
            this.iteratorVarName = scope.root.typeHelper.addNewIteratorVariable(printNode);
            scope.variables.push(new variable_1.CVariable(scope, this.iteratorVarName, types_1.NumberVarType));
            this.arraySize = varType.isDynamicArray ? accessor + "->size" : varType.capacity + "";
            var elementAccessor = accessor + (varType.isDynamicArray ? "->data" : "") + "[" + this.iteratorVarName + "]";
            var opts = { quotedString: true, indent: this.INDENT + "    " };
            this.elementPrintfs = [
                new CPrintf(scope, printNode, elementAccessor, varType.elementType, opts)
            ];
        }
        else if (varType instanceof types_1.DictType) {
            this.isDict = true;
            this.iteratorVarName = scope.root.typeHelper.addNewIteratorVariable(printNode);
            scope.variables.push(new variable_1.CVariable(scope, this.iteratorVarName, types_1.NumberVarType));
            var opts = { quotedString: true, indent: this.INDENT + "    " };
            this.elementPrintfs = [
                new CPrintf(scope, printNode, accessor + "->values->data[" + this.iteratorVarName + "]", varType.elementType, opts)
            ];
        }
        else if (varType instanceof types_1.StructType) {
            this.isStruct = true;
            for (var k in varType.properties) {
                var propAccessor = accessor + "->" + k;
                var opts = { quotedString: true, propName: k, indent: this.INDENT + "    " };
                this.elementPrintfs.push(new CPrintf(scope, printNode, propAccessor, varType.properties[k], opts));
            }
        }
    }
    CPrintf = __decorate([
        template_1.CodeTemplate("\n{#if isStringLiteral}\n    printf(\"{accessor}{CR}\");\n{#elseif isQuotedCString}\n    printf(\"{propPrefix}\\\"%s\\\"{CR}\", {accessor});\n{#elseif isCString}\n    printf(\"%s{CR}\", {accessor});\n{#elseif isInteger}\n    printf(\"{propPrefix}%d{CR}\", {accessor});\n{#elseif isBoolean && !propPrefix}\n    printf({accessor} ? \"true{CR}\" : \"false{CR}\");\n{#elseif isBoolean && propPrefix}\n    printf(\"{propPrefix}%s\", {accessor} ? \"true{CR}\" : \"false{CR}\");\n{#elseif isDict}\n    printf(\"{propPrefix}{ \");\n    {INDENT}for ({iteratorVarName} = 0; {iteratorVarName} < {accessor}->index->size; {iteratorVarName}++) {\n    {INDENT}    if ({iteratorVarName} != 0)\n    {INDENT}        printf(\", \");\n    {INDENT}    printf(\"\\\"%s\\\": \", {accessor}->index->data[{iteratorVarName}]);\n    {INDENT}    {elementPrintfs}\n    {INDENT}}\n    {INDENT}printf(\" }{CR}\");\n{#elseif isStruct}\n    printf(\"{propPrefix}{ \");\n    {INDENT}{elementPrintfs {    printf(\", \");\n    }=> {this}}\n    {INDENT}printf(\" }{CR}\");\n{#elseif isArray}\n    printf(\"{propPrefix}[ \");\n    {INDENT}for ({iteratorVarName} = 0; {iteratorVarName} < {arraySize}; {iteratorVarName}++) {\n    {INDENT}    if ({iteratorVarName} != 0)\n    {INDENT}        printf(\", \");\n    {INDENT}    {elementPrintfs}\n    {INDENT}}\n    {INDENT}printf(\" ]{CR}\");\n{#else}\n    printf(/* Unsupported printf expression */);\n{/if}")
    ], CPrintf);
    return CPrintf;
}());

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../template":12,"../types":13,"./variable":10}],9:[function(require,module,exports){
(function (global){
"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var ts = (typeof window !== "undefined" ? window['ts'] : typeof global !== "undefined" ? global['ts'] : null);
var template_1 = require('../template');
var types_1 = require('../types');
var variable_1 = require('./variable');
var elementaccess_1 = require('./elementaccess');
var assignment_1 = require('./assignment');
var CBreakStatement = (function () {
    function CBreakStatement(scope, node) {
    }
    CBreakStatement = __decorate([
        template_1.CodeTemplate("break;\n", ts.SyntaxKind.BreakStatement)
    ], CBreakStatement);
    return CBreakStatement;
}());
exports.CBreakStatement = CBreakStatement;
var CContinueStatement = (function () {
    function CContinueStatement(scope, node) {
    }
    CContinueStatement = __decorate([
        template_1.CodeTemplate("continue;\n", ts.SyntaxKind.ContinueStatement)
    ], CContinueStatement);
    return CContinueStatement;
}());
exports.CContinueStatement = CContinueStatement;
var CEmptyStatement = (function () {
    function CEmptyStatement(scope, node) {
    }
    CEmptyStatement = __decorate([
        template_1.CodeTemplate(";\n", ts.SyntaxKind.EmptyStatement)
    ], CEmptyStatement);
    return CEmptyStatement;
}());
exports.CEmptyStatement = CEmptyStatement;
var CReturnStatement = (function () {
    function CReturnStatement(scope, node) {
        this.expression = template_1.CodeTemplateFactory.createForNode(scope, node.expression);
        this.destructors = new variable_1.CVariableDestructors(scope, node);
        this.needBlock = node.parent && (node.parent.kind == ts.SyntaxKind.IfStatement
            || node.parent.kind == ts.SyntaxKind.ForStatement
            || node.parent.kind == ts.SyntaxKind.WhileStatement);
    }
    CReturnStatement = __decorate([
        template_1.CodeTemplate("\n{#if needBlock}\n    {\n        {destructors}\n        return {expression};\n    }\n{/if}\n{#if !needBlock}\n    {destructors}\n    return {expression};\n{/if}\n", ts.SyntaxKind.ReturnStatement)
    ], CReturnStatement);
    return CReturnStatement;
}());
exports.CReturnStatement = CReturnStatement;
var CIfStatement = (function () {
    function CIfStatement(scope, node) {
        this.condition = template_1.CodeTemplateFactory.createForNode(scope, node.expression);
        this.thenBlock = new CBlock(scope, node.thenStatement);
        this.hasElseBlock = !!node.elseStatement;
        this.elseBlock = this.hasElseBlock && new CBlock(scope, node.elseStatement);
    }
    CIfStatement = __decorate([
        template_1.CodeTemplate("\nif ({condition})\n{thenBlock}\n{#if hasElseBlock}\n    else\n    {elseBlock}\n{/if}\n", ts.SyntaxKind.IfStatement)
    ], CIfStatement);
    return CIfStatement;
}());
exports.CIfStatement = CIfStatement;
var CWhileStatement = (function () {
    function CWhileStatement(scope, node) {
        this.block = new CBlock(scope, node.statement);
        this.condition = template_1.CodeTemplateFactory.createForNode(scope, node.expression);
    }
    CWhileStatement = __decorate([
        template_1.CodeTemplate("\nwhile ({condition})\n{block}", ts.SyntaxKind.WhileStatement)
    ], CWhileStatement);
    return CWhileStatement;
}());
exports.CWhileStatement = CWhileStatement;
var CDoWhileStatement = (function () {
    function CDoWhileStatement(scope, node) {
        this.block = new CBlock(scope, node.statement);
        this.condition = template_1.CodeTemplateFactory.createForNode(scope, node.expression);
    }
    CDoWhileStatement = __decorate([
        template_1.CodeTemplate("\ndo\n{block}\nwhile ({condition});", ts.SyntaxKind.DoStatement)
    ], CDoWhileStatement);
    return CDoWhileStatement;
}());
exports.CDoWhileStatement = CDoWhileStatement;
var CForStatement = (function () {
    function CForStatement(scope, node) {
        this.varDecl = null;
        this.block = new CBlock(scope, node.statement);
        if (node.initializer.kind == ts.SyntaxKind.VariableDeclarationList) {
            var declList = node.initializer;
            this.varDecl = new variable_1.CVariableDeclaration(scope, declList.declarations[0]);
            this.init = "";
        }
        else
            this.init = template_1.CodeTemplateFactory.createForNode(scope, node.initializer);
        this.condition = template_1.CodeTemplateFactory.createForNode(scope, node.condition);
        this.increment = template_1.CodeTemplateFactory.createForNode(scope, node.incrementor);
    }
    CForStatement = __decorate([
        template_1.CodeTemplate("\n{#if varDecl}\n    {varDecl}\n{/if}\nfor ({init};{condition};{increment})\n{block}", ts.SyntaxKind.ForStatement)
    ], CForStatement);
    return CForStatement;
}());
exports.CForStatement = CForStatement;
var CForOfStatement = (function () {
    function CForOfStatement(scope, node) {
        this.variables = [];
        this.statements = [];
        this.cast = "";
        this.parent = scope;
        this.func = scope.func;
        this.root = scope.root;
        this.iteratorVarName = scope.root.typeHelper.addNewIteratorVariable(node);
        scope.variables.push(new variable_1.CVariable(scope, this.iteratorVarName, types_1.NumberVarType));
        this.arrayAccess = new elementaccess_1.CElementAccess(scope, node.expression);
        var arrayVarType = scope.root.typeHelper.getCType(node.expression);
        if (arrayVarType && arrayVarType instanceof types_1.ArrayType) {
            this.isDynamicArray = arrayVarType.isDynamicArray;
            this.arrayCapacity = arrayVarType.capacity + "";
            var elemType = arrayVarType.elementType;
            if (elemType instanceof types_1.ArrayType && elemType.isDynamicArray)
                this.cast = "(void *)";
        }
        if (node.initializer.kind == ts.SyntaxKind.VariableDeclarationList) {
            var declInit = node.initializer.declarations[0];
            scope.variables.push(new variable_1.CVariable(scope, declInit.name.getText(), declInit.name));
            this.init = declInit.name.getText();
        }
        else {
            this.init = new elementaccess_1.CElementAccess(scope, node.initializer);
        }
        this.statements.push(template_1.CodeTemplateFactory.createForNode(this, node.statement));
        scope.variables = scope.variables.concat(this.variables);
        this.variables = [];
    }
    CForOfStatement = __decorate([
        template_1.CodeTemplate("\n{#if isDynamicArray}\n    for ({iteratorVarName} = 0; {iteratorVarName} < {arrayAccess}->size; {iteratorVarName}++)\n    {\n        {init} = {cast}{arrayAccess}->data[{iteratorVarName}];\n        {statements {    }=> {this}}\n    }\n{#else}\n    for ({iteratorVarName} = 0; {iteratorVarName} < {arrayCapacity}; {iteratorVarName}++)\n    {\n        {init} = {cast}{arrayAccess}[{iteratorVarName}];\n        {statements {    }=> {this}}\n    }\n{/if}\n", ts.SyntaxKind.ForOfStatement)
    ], CForOfStatement);
    return CForOfStatement;
}());
exports.CForOfStatement = CForOfStatement;
var CForInStatement = (function () {
    function CForInStatement(scope, node) {
        this.variables = [];
        this.statements = [];
        this.parent = scope;
        this.func = scope.func;
        this.root = scope.root;
        this.iteratorVarName = scope.root.typeHelper.addNewIteratorVariable(node);
        scope.variables.push(new variable_1.CVariable(scope, this.iteratorVarName, types_1.NumberVarType));
        this.varAccess = new elementaccess_1.CElementAccess(scope, node.expression);
        var dictVarType = scope.root.typeHelper.getCType(node.expression);
        // TODO: do something with dictVarType
        if (node.initializer.kind == ts.SyntaxKind.VariableDeclarationList) {
            var declInit = node.initializer.declarations[0];
            scope.variables.push(new variable_1.CVariable(scope, declInit.name.getText(), declInit.name));
            this.init = declInit.name.getText();
        }
        else
            this.init = new elementaccess_1.CElementAccess(scope, node.initializer);
        if (node.statement.kind == ts.SyntaxKind.Block) {
            var block = node.statement;
            for (var _i = 0, _a = block.statements; _i < _a.length; _i++) {
                var s = _a[_i];
                this.statements.push(template_1.CodeTemplateFactory.createForNode(this, s));
            }
        }
        else
            this.statements.push(template_1.CodeTemplateFactory.createForNode(this, node.statement));
        scope.variables = scope.variables.concat(this.variables);
        this.variables = [];
    }
    CForInStatement = __decorate([
        template_1.CodeTemplate("\nfor ({iteratorVarName} = 0; {iteratorVarName} < {varAccess}->index->size; {iteratorVarName}++)\n{\n    {init} = {varAccess}->index->data[{iteratorVarName}];\n    {statements {    }=> {this}}\n}\n", ts.SyntaxKind.ForInStatement)
    ], CForInStatement);
    return CForInStatement;
}());
exports.CForInStatement = CForInStatement;
var CProperty = (function () {
    function CProperty(varAccess, index, name, init) {
        this.varAccess = varAccess;
        this.index = index;
        this.name = name;
        this.init = init;
    }
    return CProperty;
}());
var CExpressionStatement = (function () {
    function CExpressionStatement(scope, node) {
        this.SemicolonCR = ';\n';
        if (node.expression.kind == ts.SyntaxKind.BinaryExpression) {
            var binExpr = node.expression;
            if (binExpr.operatorToken.kind == ts.SyntaxKind.EqualsToken) {
                this.expression = assignment_1.AssignmentHelper.create(scope, binExpr.left, binExpr.right);
                ;
                this.SemicolonCR = '';
            }
        }
        if (!this.expression)
            this.expression = template_1.CodeTemplateFactory.createForNode(scope, node.expression);
    }
    CExpressionStatement = __decorate([
        template_1.CodeTemplate("{expression}{SemicolonCR}", ts.SyntaxKind.ExpressionStatement)
    ], CExpressionStatement);
    return CExpressionStatement;
}());
exports.CExpressionStatement = CExpressionStatement;
var CBlock = (function () {
    function CBlock(scope, node) {
        var _this = this;
        this.variables = [];
        this.statements = [];
        this.parent = scope;
        this.func = scope.func;
        this.root = scope.root;
        if (node.kind == ts.SyntaxKind.Block) {
            var block = node;
            block.statements.forEach(function (s) { return _this.statements.push(template_1.CodeTemplateFactory.createForNode(_this, s)); });
        }
        else
            this.statements.push(template_1.CodeTemplateFactory.createForNode(this, node));
    }
    CBlock = __decorate([
        template_1.CodeTemplate("\n{#if statements.length > 1 || variables.length > 0}\n    {\n        {variables {    }=> {this};\n}\n        {statements {    }=> {this}}\n    }\n{/if}\n{#if statements.length == 1 && variables.length == 0}\n        {statements}\n{/if}\n{#if statements.length == 0 && variables.length == 0}\n        /* no statements */;\n{/if}", ts.SyntaxKind.Block)
    ], CBlock);
    return CBlock;
}());
exports.CBlock = CBlock;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../template":12,"../types":13,"./assignment":4,"./elementaccess":5,"./variable":10}],10:[function(require,module,exports){
(function (global){
"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var ts = (typeof window !== "undefined" ? window['ts'] : typeof global !== "undefined" ? global['ts'] : null);
var template_1 = require('../template');
var types_1 = require('../types');
var assignment_1 = require('./assignment');
var CVariableStatement = (function () {
    function CVariableStatement(scope, node) {
        this.declarations = node.declarationList.declarations.map(function (d) { return template_1.CodeTemplateFactory.createForNode(scope, d); });
    }
    CVariableStatement = __decorate([
        template_1.CodeTemplate("{declarations}", ts.SyntaxKind.VariableStatement)
    ], CVariableStatement);
    return CVariableStatement;
}());
exports.CVariableStatement = CVariableStatement;
var CVariableDeclarationList = (function () {
    function CVariableDeclarationList(scope, node) {
        this.declarations = node.declarations.map(function (d) { return template_1.CodeTemplateFactory.createForNode(scope, d); });
    }
    CVariableDeclarationList = __decorate([
        template_1.CodeTemplate("{declarations}", ts.SyntaxKind.VariableDeclarationList)
    ], CVariableDeclarationList);
    return CVariableDeclarationList;
}());
exports.CVariableDeclarationList = CVariableDeclarationList;
var CVariableDeclaration = (function () {
    function CVariableDeclaration(scope, varDecl) {
        this.allocator = '';
        this.initializer = '';
        var varInfo = scope.root.typeHelper.getVariableInfo(varDecl.name);
        scope.variables.push(new CVariable(scope, varInfo.name, varInfo.type));
        if (varInfo.requiresAllocation)
            this.allocator = new CVariableAllocation(scope, varInfo.name, varInfo.type, varDecl.name);
        if (varDecl.initializer)
            this.initializer = assignment_1.AssignmentHelper.create(scope, varDecl.name, varDecl.initializer);
    }
    CVariableDeclaration = __decorate([
        template_1.CodeTemplate("\n{allocator}\n{initializer}", ts.SyntaxKind.VariableDeclaration)
    ], CVariableDeclaration);
    return CVariableDeclaration;
}());
exports.CVariableDeclaration = CVariableDeclaration;
var CVariableAllocation = (function () {
    function CVariableAllocation(scope, varName, varType, refNode) {
        this.varName = varName;
        this.needAllocateArray = varType instanceof types_1.ArrayType && varType.isDynamicArray;
        this.needAllocateStruct = varType instanceof types_1.StructType;
        this.needAllocateDict = varType instanceof types_1.DictType;
        this.initialCapacity = 4;
        this.gcVarName = scope.root.memoryManager.getGCVariableForNode(refNode);
        if (varType instanceof types_1.ArrayType) {
            this.initialCapacity = Math.max(varType.capacity * 2, 4);
            this.size = varType.capacity;
        }
        if (this.needAllocateStruct || this.needAllocateArray || this.needAllocateDict)
            scope.root.headerFlags.malloc = true;
        if (this.gcVarName || this.needAllocateArray)
            scope.root.headerFlags.array = true;
        if (this.needAllocateDict)
            scope.root.headerFlags.dict = true;
        if (this.gcVarName)
            scope.root.headerFlags.gc_iterator = true;
    }
    CVariableAllocation = __decorate([
        template_1.CodeTemplate("\n{#if needAllocateArray}\n    ARRAY_CREATE({varName}, {initialCapacity}, {size});\n{#elseif needAllocateDict}\n    DICT_CREATE({varName}, {initialCapacity});\n{#elseif needAllocateStruct}\n    {varName} = malloc(sizeof(*{varName}));\n    assert({varName} != NULL);\n{/if}\n{#if gcVarName && (needAllocateStruct || needAllocateArray || needAllocateDict)}\n    ARRAY_PUSH({gcVarName}, (void *){varName});\n{/if}\n")
    ], CVariableAllocation);
    return CVariableAllocation;
}());
exports.CVariableAllocation = CVariableAllocation;
var CVariableDestructors = (function () {
    function CVariableDestructors(scope, node) {
        var _this = this;
        this.gcVarName = null;
        this.gcArraysVarName = null;
        this.gcDictsVarName = null;
        var gcVarNames = scope.root.memoryManager.getGCVariablesForScope(node);
        for (var _i = 0, gcVarNames_1 = gcVarNames; _i < gcVarNames_1.length; _i++) {
            var gc = gcVarNames_1[_i];
            if (gc.indexOf("_arrays") > -1)
                this.gcArraysVarName = gc;
            else if (gc.indexOf("_dicts") > -1)
                this.gcDictsVarName = gc;
            else
                this.gcVarName = gc;
        }
        this.destructors = [];
        scope.root.memoryManager.getDestructorsForScope(node)
            .forEach(function (r) {
            var type = scope.root.typeHelper.getCType(r.node);
            if (type instanceof types_1.ArrayType)
                _this.destructors.push(r.varName + "->data");
            if (type instanceof types_1.DictType) {
                _this.destructors.push(r.varName + "->index->data");
                _this.destructors.push(r.varName + "->index");
                _this.destructors.push(r.varName + "->values->data");
                _this.destructors.push(r.varName + "->values");
            }
            _this.destructors.push(r.varName);
        });
    }
    CVariableDestructors = __decorate([
        template_1.CodeTemplate("\n{destructors {    }=> free({this});\n}\n{#if gcArraysVarName}\n        for (gc_i = 0; gc_i < {gcArraysVarName}->size; gc_i++) {\n            free({gcArraysVarName}->data[gc_i]->data);\n            free({gcArraysVarName}->data[gc_i]);\n        }\n        free({gcArraysVarName}->data);\n        free({gcArraysVarName});\n{/if}\n{#if gcDictsVarName}\n        for (gc_i = 0; gc_i < {gcDictsVarName}->size; gc_i++) {\n            free({gcDictsVarName}->data[gc_i]->index->data);\n            free({gcDictsVarName}->data[gc_i]->index);\n            free({gcDictsVarName}->data[gc_i]->values->data);\n            free({gcDictsVarName}->data[gc_i]->values);\n            free({gcDictsVarName}->data[gc_i]);\n        }\n        free({gcDictsVarName}->data);\n        free({gcDictsVarName});\n{/if}\n{#if gcVarName}\n        for (gc_i = 0; gc_i < {gcVarName}->size; gc_i++)\n            free({gcVarName}->data[gc_i]);\n        free({gcVarName}->data);\n        free({gcVarName});\n{/if}")
    ], CVariableDestructors);
    return CVariableDestructors;
}());
exports.CVariableDestructors = CVariableDestructors;
var CVariable = (function () {
    function CVariable(scope, name, typeSource, options) {
        this.name = name;
        this.typeSource = typeSource;
        var typeString = scope.root.typeHelper.getTypeString(typeSource);
        if (typeString == types_1.NumberVarType)
            scope.root.headerFlags.int16_t = true;
        else if (typeString == types_1.BooleanVarType)
            scope.root.headerFlags.uint8_t = true;
        if (typeString.indexOf('{var}') > -1)
            this.varString = typeString.replace('{var}', name);
        else
            this.varString = typeString + " " + name;
        // root scope, make variables file-scoped by default
        if (scope.parent == null && this.varString.indexOf('static') != 0)
            this.varString = 'static ' + this.varString;
        if (options && options.removeStorageSpecifier)
            this.varString = this.varString.replace(/^static /, '');
        if (options && options.initializer)
            this.varString += " = " + options.initializer;
    }
    CVariable.prototype.resolve = function () {
        return this.varString;
    };
    return CVariable;
}());
exports.CVariable = CVariable;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../template":12,"../types":13,"./assignment":4}],11:[function(require,module,exports){
(function (global){
"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var ts = (typeof window !== "undefined" ? window['ts'] : typeof global !== "undefined" ? global['ts'] : null);
var memory_1 = require('./memory');
var types_1 = require('./types');
var template_1 = require('./template');
var function_1 = require('./nodes/function');
var variable_1 = require('./nodes/variable');
// these imports are here only because it is necessary to run decorators
require('./nodes/statements');
require('./nodes/expressions');
var HeaderFlags = (function () {
    function HeaderFlags() {
        this.strings = false;
        this.printf = false;
        this.malloc = false;
        this.bool = false;
        this.uint8_t = false;
        this.int16_t = false;
        this.js_var = false;
        this.array = false;
        this.array_pop = false;
        this.array_insert = false;
        this.array_remove = false;
        this.gc_iterator = false;
        this.dict = false;
        this.str_int16_t_cmp = false;
        this.str_int16_t_cat = false;
        this.str_pos = false;
        this.str_len = false;
        this.atoi = false;
    }
    return HeaderFlags;
}());
var CProgram = (function () {
    function CProgram(tsProgram) {
        var _this = this;
        this.parent = null;
        this.root = this;
        this.func = this;
        this.variables = [];
        this.statements = [];
        this.functions = [];
        this.headerFlags = new HeaderFlags();
        this.typeChecker = tsProgram.getTypeChecker();
        this.typeHelper = new types_1.TypeHelper(this.typeChecker);
        this.memoryManager = new memory_1.MemoryManager(this.typeChecker, this.typeHelper);
        var structs = this.typeHelper.figureOutVariablesAndTypes(tsProgram.getSourceFiles());
        this.userStructs = structs.map(function (s) {
            return {
                name: s.name,
                properties: s.properties.map(function (p) { return new variable_1.CVariable(_this, p.name, p.type, { removeStorageSpecifier: true }); })
            };
        });
        this.memoryManager.preprocessVariables();
        for (var _i = 0, _a = tsProgram.getSourceFiles(); _i < _a.length; _i++) {
            var source = _a[_i];
            this.memoryManager.preprocessTemporaryVariables(source);
        }
        this.gcVarNames = this.memoryManager.getGCVariablesForScope(null);
        for (var _b = 0, _c = this.gcVarNames; _b < _c.length; _b++) {
            var gcVarName = _c[_b];
            var pointerType = new types_1.ArrayType("void *", 0, true);
            if (gcVarName.indexOf("arrays") == -1)
                this.variables.push(new variable_1.CVariable(this, gcVarName, pointerType));
            else
                this.variables.push(new variable_1.CVariable(this, gcVarName, new types_1.ArrayType(pointerType, 0, true)));
        }
        for (var _d = 0, _e = tsProgram.getSourceFiles(); _d < _e.length; _d++) {
            var source = _e[_d];
            for (var _f = 0, _g = source.statements; _f < _g.length; _f++) {
                var s = _g[_f];
                if (s.kind == ts.SyntaxKind.FunctionDeclaration)
                    this.functions.push(new function_1.CFunction(this, s));
                else
                    this.statements.push(template_1.CodeTemplateFactory.createForNode(this, s));
            }
        }
        this.destructors = new variable_1.CVariableDestructors(this, null);
    }
    CProgram = __decorate([
        template_1.CodeTemplate("\n{#if headerFlags.strings || headerFlags.str_int16_t_cmp || headerFlags.str_int16_t_cat || headerFlags.str_pos || headerFlags.array_insert || headerFlags.dict}\n    #include <string.h>\n{/if}\n{#if headerFlags.malloc || headerFlags.atoi || headerFlags.array}\n    #include <stdlib.h>\n{/if}\n{#if headerFlags.malloc || headerFlags.array}\n    #include <assert.h>\n{/if}\n{#if headerFlags.printf}\n    #include <stdio.h>\n{/if}\n{#if headerFlags.str_int16_t_cmp || headerFlags.str_int16_t_cat}\n    #include <limits.h>\n{/if}\n\n{#if headerFlags.bool}\n    #define TRUE 1\n    #define FALSE 0\n{/if}\n{#if headerFlags.bool || headerFlags.js_var}\n    typedef unsigned char uint8_t;\n{/if}\n{#if headerFlags.int16_t || headerFlags.js_var || headerFlags.array ||\n     headerFlags.str_int16_t_cmp || headerFlags.str_pos || headerFlags.str_len}\n    typedef int int16_t;\n{/if}\n\n{#if headerFlags.js_var}\n    enum js_var_type {JS_VAR_BOOL, JS_VAR_INT, JS_VAR_STRING, JS_VAR_ARRAY, JS_VAR_STRUCT, JS_VAR_DICT};\n\tstruct js_var {\n\t    enum js_var_type type;\n\t    uint8_t bool;\n\t    int16_t number;\n\t    const char *string;\n\t    void *obj;\n\t};\n{/if}\n\n{#if headerFlags.array || headerFlags.dict}\n    #define ARRAY(T) struct {\\\n        int16_t size;\\\n        int16_t capacity;\\\n        T *data;\\\n    } *\n    #define ARRAY_CREATE(array, init_capacity, init_size) {\\\n        array = malloc(sizeof(*array)); \\\n        array->data = malloc(init_capacity * sizeof(*array->data)); \\\n        assert(array->data != NULL); \\\n        array->capacity = init_capacity; \\\n        array->size = init_size; \\\n    }\n    #define ARRAY_PUSH(array, item) {\\\n        if (array->size == array->capacity) {  \\\n            array->capacity *= 2;  \\\n            array->data = realloc(array->data, array->capacity * sizeof(*array->data)); \\\n            assert(array->data != NULL); \\\n        }  \\\n        array->data[array->size++] = item; \\\n    }\n{/if}\n{#if headerFlags.array_pop}\n\t#define ARRAY_POP(a) (a->size != 0 ? a->data[--a->size] : 0)\n{/if}\n{#if headerFlags.array_insert || headerFlags.dict}\n    #define ARRAY_INSERT(array, pos, item) {\\\n        ARRAY_PUSH(array, item); \\\n        if (pos < array->size - 1) {\\\n            memmove(&(array->data[pos + 1]), &(array->data[pos]), (array->size - pos - 1) * sizeof(*array->data)); \\\n            array->data[pos] = item; \\\n        } \\\n    }\n{/if}\n{#if headerFlags.array_remove}\n    #define ARRAY_REMOVE(array, pos) {\\\n        memmove(array[pos], array[pos + 1], array-size - pos - 1); \\\n        array->size--; \\\n    }\n{/if}\n\n{#if headerFlags.dict}\n    #define DICT(T) struct { \\\n        ARRAY(const char *) index; \\\n        ARRAY(T) values; \\\n    } *\n    #define DICT_CREATE(dict, init_capacity) { \\\n        dict = malloc(sizeof(*dict)); \\\n        ARRAY_CREATE(dict->index, init_capacity, 0); \\\n        ARRAY_CREATE(dict->values, init_capacity, 0); \\\n    }\n\n    int16_t dict_find_pos(const char ** keys, int16_t keys_size, const char * key) {\n        int16_t low = 0;\n        int16_t high = keys_size - 1;\n\n        if (keys_size == 0 || key == NULL)\n            return -1;\n\n        while (low <= high)\n        {\n            int mid = (low + high) / 2;\n            int res = strcmp(keys[mid], key);\n\n            if (res == 0)\n                return mid;\n            else if (res < 0)\n                low = mid + 1;\n            else\n                high = mid - 1;\n        }\n\n        return -1 - low;\n    }\n\n    int16_t tmp_dict_pos;\n    #define DICT_GET(dict, prop) ((tmp_dict_pos = dict_find_pos(dict->index->data, dict->index->size, prop)) < 0 ? 0 : dict->values->data[tmp_dict_pos])\n    #define DICT_SET(dict, prop, value) { \\\n        tmp_dict_pos = dict_find_pos(dict->index->data, dict->index->size, prop); \\\n        if (tmp_dict_pos < 0) { \\\n            tmp_dict_pos = -tmp_dict_pos - 1; \\\n            ARRAY_INSERT(dict->index, tmp_dict_pos, prop); \\\n            ARRAY_INSERT(dict->values, tmp_dict_pos, value); \\\n        } else \\\n            dict->values->data[tmp_dict_pos] = value; \\\n    }\n\n{/if}\n\n{#if headerFlags.str_int16_t_cmp || headerFlags.str_int16_t_cat}\n    #define STR_INT16_T_BUFLEN ((CHAR_BIT * sizeof(int16_t) - 1) / 3 + 2)\n{/if}\n{#if headerFlags.str_int16_t_cmp}\n    int str_int16_t_cmp(const char * str, int16_t num) {\n        char numstr[STR_INT16_T_BUFLEN];\n        sprintf(numstr, \"%d\", num);\n        return strcmp(str, numstr);\n    }\n{/if}\n{#if headerFlags.str_pos}\n    int16_t str_pos(const char * str, const char *search) {\n        int16_t i;\n        const char * found = strstr(str, search);\n        int16_t pos = 0;\n        if (found == 0)\n            return -1;\n        while (*str && str < found) {\n            i = 1;\n            if ((*str & 0xE0) == 0xC0) i=2;\n            else if ((*str & 0xF0) == 0xE0) i=3;\n            else if ((*str & 0xF8) == 0xF0) i=4;\n            str += i;\n            pos += i == 4 ? 2 : 1;\n        }\n        return pos;\n    }\n{/if}\n{#if headerFlags.str_len}\n    int16_t str_len(const char * str) {\n        int16_t len = 0;\n        int16_t i = 0;\n        while (*str) {\n            i = 1;\n            if ((*str & 0xE0) == 0xC0) i=2;\n            else if ((*str & 0xF0) == 0xE0) i=3;\n            else if ((*str & 0xF8) == 0xF0) i=4;\n            str += i;\n            len += i == 4 ? 2 : 1;\n        }\n        return len;\n    }\n{/if}\n{#if headerFlags.str_int16_t_cat}\n    void str_int16_t_cat(char *str, int16_t num) {\n        char numstr[STR_INT16_T_BUFLEN];\n        sprintf(numstr, \"%d\", num);\n        strcat(str, numstr);\n    }\n{/if}\n\n{#if headerFlags.gc_iterator}\n    int16_t gc_i;\n{/if}\n\n{userStructs => struct {name} {\n    {properties {    }=> {this};\n}};\n}\n\n{variables => {this};\n}\n\n{functions => {this}\n}\n\nint main(void) {\n    {gcVarNames {    }=> ARRAY_CREATE({this}, 2, 0);\n}\n\n    {statements {    }=> {this}}\n\n    {destructors}\n    return 0;\n}")
    ], CProgram);
    return CProgram;
}());
exports.CProgram = CProgram;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./memory":3,"./nodes/expressions":6,"./nodes/function":7,"./nodes/statements":9,"./nodes/variable":10,"./template":12,"./types":13}],12:[function(require,module,exports){
"use strict";
;
var nodeKindTemplates = {};
var CodeTemplateFactory = (function () {
    function CodeTemplateFactory() {
    }
    CodeTemplateFactory.createForNode = function (scope, node) {
        return nodeKindTemplates[node.kind] && new nodeKindTemplates[node.kind](scope, node)
            || "/* Unsupported node: " + node.getText().replace(/[\n\s]+/g, ' ') + " */;\n";
    };
    return CodeTemplateFactory;
}());
exports.CodeTemplateFactory = CodeTemplateFactory;
function CodeTemplate(tempString, nodeKind) {
    return function (target) {
        var newConstructor = function (scope) {
            var rest = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                rest[_i - 1] = arguments[_i];
            }
            var self = this;
            var retValue = target.apply(self, arguments);
            var _a = processTemplate(tempString, self), code = _a[0], statements = _a[1];
            if (statements)
                scope.statements.push(statements);
            self.resolve = function () {
                return code;
            };
            return retValue;
        };
        if (nodeKind) {
            if (typeof nodeKind === 'number')
                nodeKindTemplates[nodeKind] = newConstructor;
            else
                for (var _i = 0, nodeKind_1 = nodeKind; _i < nodeKind_1.length; _i++) {
                    var nk = nodeKind_1[_i];
                    nodeKindTemplates[nk] = newConstructor;
                }
        }
        return newConstructor;
    };
}
exports.CodeTemplate = CodeTemplate;
/** Returns: [code, statements] */
function processTemplate(template, args) {
    var statements = "";
    if (template.indexOf("{#statements}") > -1) {
        var statementsStartPos = template.indexOf("{#statements}");
        var statementsBodyStartPos = statementsStartPos + "{#statements}".length;
        var statementsBodyEndPos = template.indexOf("{/statements}");
        var statementsEndPos = statementsBodyEndPos + "{/statements}".length;
        while (statementsStartPos > 0 && (template[statementsStartPos - 1] == ' ' || template[statementsStartPos - 1] == '\n'))
            statementsStartPos--;
        if (statementsBodyEndPos > 0 && template[statementsBodyEndPos - 1] == '\n')
            statementsBodyEndPos--;
        var templateText = template.slice(statementsBodyStartPos, statementsBodyEndPos).replace(/\n    /g, '\n');
        var _a = processTemplate(templateText, args), c = _a[0], s = _a[1];
        statements += s + c;
        template = template.slice(0, statementsStartPos) + template.slice(statementsEndPos);
    }
    if (typeof args === "string")
        return [template.replace("{this}", args), statements];
    var ifPos;
    while ((ifPos = template.indexOf("{#if ")) > -1) {
        var posBeforeIf = ifPos;
        while (posBeforeIf > 0 && (template[posBeforeIf - 1] == ' ' || template[posBeforeIf - 1] == '\n'))
            posBeforeIf--;
        ifPos += 5;
        var conditionStartPos = ifPos;
        while (template[ifPos] != "}")
            ifPos++;
        var endIfPos = template.indexOf("{/if}", ifPos);
        var elseIfPos = template.indexOf("{#elseif ", ifPos);
        var elsePos = template.indexOf("{#else}", ifPos);
        var endIfBodyPos = endIfPos;
        if (elseIfPos != -1 && elseIfPos < endIfBodyPos)
            endIfBodyPos = elseIfPos;
        if (elsePos != -1 && elsePos < endIfBodyPos)
            endIfBodyPos = elsePos;
        if (endIfBodyPos > 0 && template[endIfBodyPos - 1] == '\n')
            endIfBodyPos--;
        var posAfterIf = endIfPos + 5;
        if (endIfPos > 0 && template[endIfPos - 1] == '\n')
            endIfPos--;
        var evalText = template.slice(conditionStartPos, ifPos);
        for (var k_1 in args)
            evalText = evalText.replace(new RegExp("\\b" + k_1 + "\\b", "g"), function (m) { return "args." + m; });
        var evalResult = eval(evalText);
        if (evalResult)
            template = template.slice(0, posBeforeIf) + template.slice(ifPos + 1, endIfBodyPos).replace(/\n    /g, '\n') + template.slice(posAfterIf);
        else if (elseIfPos > -1)
            template = template.slice(0, posBeforeIf) + "{#" + template.slice(elseIfPos + 6);
        else if (elsePos > -1)
            template = template.slice(0, posBeforeIf) + template.slice(elsePos + 7, endIfPos).replace(/\n    /g, '\n') + template.slice(posAfterIf);
        else
            template = template.slice(0, posBeforeIf) + template.slice(posAfterIf);
    }
    var replaced = false;
    for (var k in args) {
        if (k == "resolve")
            continue;
        if (args[k] && args[k].push) {
            var pos = template.indexOf("{" + k + '}');
            if (pos == -1)
                pos = template.indexOf("{" + k + ' ');
            else {
                var elementsResolved_1 = '';
                for (var _i = 0, _b = args[k]; _i < _b.length; _i++) {
                    var element = _b[_i];
                    var _c = processTemplate("{this}", element), resolvedElement = _c[0], elementStatements = _c[1];
                    statements += elementStatements;
                    elementsResolved_1 += resolvedElement;
                }
                template = template.slice(0, pos) + elementsResolved_1 + template.slice(pos + k.length + 2);
                replaced = true;
                continue;
            }
            if (pos == -1)
                pos = template.indexOf("{" + k + '=');
            if (pos == -1)
                pos = template.indexOf("{" + k + '{');
            if (pos == -1)
                continue;
            var startPos = pos;
            pos += k.length + 1;
            while (template[pos] == ' ')
                pos++;
            var separator = '';
            if (template[pos] == '{') {
                pos++;
                while (template[pos] != '}' && pos < template.length) {
                    separator += template[pos];
                    pos++;
                }
                pos++;
            }
            if (pos >= template.length - 2 || template[pos] !== "=" || template[pos + 1] !== ">")
                throw new Error("Internal error: incorrect template format for array " + k + ".");
            pos += 2;
            if (template[pos] == ' ' && template[pos + 1] != ' ')
                pos++;
            var curlyBracketCounter = 1;
            var elementTemplateStart = pos;
            while (curlyBracketCounter > 0) {
                if (pos == template.length)
                    throw new Error("Internal error: incorrect template format for array " + k + ".");
                if (template[pos] == '{')
                    curlyBracketCounter++;
                if (template[pos] == '}')
                    curlyBracketCounter--;
                pos++;
            }
            var elementTemplate = template.slice(elementTemplateStart, pos - 1);
            var elementsResolved = "";
            for (var _d = 0, _e = args[k]; _d < _e.length; _d++) {
                var element = _e[_d];
                var _f = processTemplate(elementTemplate, element), resolvedElement = _f[0], elementStatements = _f[1];
                statements += elementStatements;
                if (k == 'statements') {
                    resolvedElement = resolvedElement.replace(/[;\n*]+;/g, ';');
                    if (resolvedElement.search(/\n/) > -1) {
                        for (var _g = 0, _h = resolvedElement.split('\n'); _g < _h.length; _g++) {
                            var line = _h[_g];
                            if (line != '') {
                                if (elementsResolved != "")
                                    elementsResolved += separator;
                                elementsResolved += line + '\n';
                            }
                        }
                    }
                    else {
                        if (elementsResolved != "")
                            elementsResolved += separator;
                        if (statements.search(/^[\n\s]*$/) == -1)
                            elementsResolved += resolvedElement + '\n';
                    }
                }
                else {
                    if (elementsResolved != "")
                        elementsResolved += separator;
                    elementsResolved += resolvedElement;
                }
            }
            if (args[k].length == 0) {
                while (pos < template.length && template[pos] == ' ')
                    pos++;
                while (pos < template.length && template[pos] == '\n')
                    pos++;
                while (startPos > 0 && template[startPos - 1] == ' ')
                    startPos--;
                while (startPos > 0 && template[startPos - 1] == '\n')
                    startPos--;
                if (template[startPos] == '\n')
                    startPos++;
            }
            template = template.slice(0, startPos) + elementsResolved + template.slice(pos);
            replaced = true;
        }
        else
            while (template.indexOf("{" + k + "}") > -1) {
                var value = args[k];
                if (value && value.resolve)
                    value = value.resolve();
                template = template.replace("{" + k + "}", value);
                replaced = true;
            }
    }
    if (args["resolve"] && !replaced && template.indexOf("{this}") > -1) {
        template = template.replace("{this}", args["resolve"]());
    }
    template = template.replace(/^[\n]*/, '').replace(/\n\s*\n[\n\s]*\n/g, '\n\n');
    return [template, statements];
}

},{}],13:[function(require,module,exports){
(function (global){
"use strict";
var ts = (typeof window !== "undefined" ? window['ts'] : typeof global !== "undefined" ? global['ts'] : null);
exports.UniversalVarType = "struct js_var *";
exports.PointerVarType = "void *";
exports.StringVarType = "const char *";
exports.NumberVarType = "int16_t";
exports.BooleanVarType = "uint8_t";
var ArrayType = (function () {
    function ArrayType(elementType, capacity, isDynamicArray) {
        this.elementType = elementType;
        this.capacity = capacity;
        this.isDynamicArray = isDynamicArray;
    }
    ArrayType.prototype.getText = function () {
        var elementType = this.elementType;
        var elementTypeText;
        if (typeof elementType === 'string')
            elementTypeText = elementType;
        else
            elementTypeText = elementType.getText();
        if (this.isDynamicArray)
            return "ARRAY(" + elementTypeText + ")";
        else
            return "static " + elementTypeText + " {var}[" + this.capacity + "]";
    };
    return ArrayType;
}());
exports.ArrayType = ArrayType;
var StructType = (function () {
    function StructType(structName, properties) {
        this.structName = structName;
        this.properties = properties;
    }
    StructType.prototype.getText = function () {
        return this.structName;
    };
    return StructType;
}());
exports.StructType = StructType;
var DictType = (function () {
    function DictType(elementType) {
        this.elementType = elementType;
    }
    DictType.prototype.getText = function () {
        var elementType = this.elementType;
        var elementTypeText;
        if (typeof elementType === 'string')
            elementTypeText = elementType;
        else
            elementTypeText = elementType.getText();
        return "DICT(" + elementTypeText + ")";
    };
    return DictType;
}());
exports.DictType = DictType;
var VariableInfo = (function () {
    function VariableInfo() {
        /** Contains all references to this variable */
        this.references = [];
    }
    return VariableInfo;
}());
exports.VariableInfo = VariableInfo;
var TypePromise = (function () {
    function TypePromise(associatedNode, element) {
        this.associatedNode = associatedNode;
        this.element = element;
        this.resolved = false;
        this.arrayOf = false;
    }
    return TypePromise;
}());
var VariableData = (function () {
    function VariableData() {
        this.assignmentTypes = {};
        this.typePromises = [];
        this.addedProperties = {};
        this.objLiteralAssigned = false;
    }
    return VariableData;
}());
var TypeHelper = (function () {
    function TypeHelper(typeChecker) {
        this.typeChecker = typeChecker;
        this.variables = {};
        this.userStructs = {};
        this.variablesData = {};
        this.functionCallsData = {};
        this.arrayLiteralsTypes = {};
        this.objectLiteralsTypes = {};
        this.temporaryVariables = {};
        this.iteratorVarNames = ['i', 'j', 'k', 'l', 'm', 'n'];
    }
    /** Performs initialization of variables array */
    /** Call this before using getVariableInfo */
    TypeHelper.prototype.figureOutVariablesAndTypes = function (sources) {
        var _this = this;
        for (var _i = 0, sources_1 = sources; _i < sources_1.length; _i++) {
            var source = sources_1[_i];
            this.findVariablesRecursively(source);
        }
        this.resolvePromisesAndFinalizeTypes();
        return Object.keys(this.userStructs)
            .filter(function (k) { return Object.keys(_this.userStructs[k].properties).length > 0; })
            .map(function (k) {
            return {
                name: k,
                properties: Object.keys(_this.userStructs[k].properties)
                    .map(function (pk) {
                    return {
                        name: pk,
                        type: _this.userStructs[k].properties[pk]
                    };
                })
            };
        });
    };
    TypeHelper.prototype.getCType = function (node) {
        if (!node.kind)
            return null;
        switch (node.kind) {
            case ts.SyntaxKind.NumericLiteral:
                return exports.NumberVarType;
            case ts.SyntaxKind.TrueKeyword:
            case ts.SyntaxKind.FalseKeyword:
                return exports.BooleanVarType;
            case ts.SyntaxKind.StringLiteral:
                return exports.StringVarType;
            case ts.SyntaxKind.Identifier:
                {
                    var varInfo = this.getVariableInfo(node);
                    return varInfo && varInfo.type || null;
                }
            case ts.SyntaxKind.ElementAccessExpression:
                {
                    var elemAccess = node;
                    var parentObjectType = this.getCType(elemAccess.expression);
                    if (parentObjectType instanceof ArrayType)
                        return parentObjectType.elementType;
                    else if (parentObjectType instanceof StructType)
                        return parentObjectType.properties[elemAccess.argumentExpression.getText().slice(1, -1)];
                    else if (parentObjectType instanceof DictType)
                        return parentObjectType.elementType;
                    return null;
                }
            case ts.SyntaxKind.PropertyAccessExpression:
                {
                    var propAccess = node;
                    var parentObjectType = this.getCType(propAccess.expression);
                    if (parentObjectType instanceof StructType)
                        return parentObjectType.properties[propAccess.name.getText()];
                    else if (parentObjectType instanceof ArrayType && propAccess.name.getText() == "length")
                        return exports.NumberVarType;
                    else if (parentObjectType === exports.StringVarType && propAccess.name.getText() == "length")
                        return exports.NumberVarType;
                    return null;
                }
            case ts.SyntaxKind.CallExpression:
                {
                    var call = node;
                    if (call.expression.kind == ts.SyntaxKind.PropertyAccessExpression) {
                        var propAccess = call.expression;
                        if (propAccess.name.getText() == 'pop' && call.arguments.length == 0) {
                            var arrType = this.getCType(propAccess.expression);
                            if (arrType && arrType instanceof ArrayType)
                                return arrType.elementType;
                        }
                        else if (propAccess.name.getText() == 'push' && call.arguments.length == 1) {
                            var arrType = this.getCType(propAccess.expression);
                            if (arrType && arrType instanceof ArrayType)
                                return exports.NumberVarType;
                        }
                        else if (propAccess.name.getText() == 'indexOf' && call.arguments.length == 1) {
                            var arrType = this.getCType(propAccess.expression);
                            if (arrType && (arrType == exports.StringVarType || arrType instanceof ArrayType))
                                return exports.NumberVarType;
                        }
                    }
                    return null;
                }
            case ts.SyntaxKind.ArrayLiteralExpression:
                return this.arrayLiteralsTypes[node.pos];
            case ts.SyntaxKind.ObjectLiteralExpression:
                return this.objectLiteralsTypes[node.pos];
            default:
                {
                    var tsType = this.typeChecker.getTypeAtLocation(node);
                    var type = tsType && this.convertType(tsType);
                    if (type != exports.UniversalVarType && type != exports.PointerVarType)
                        return type;
                }
                return null;
        }
    };
    /** Get information of variable specified by ts.Identifier */
    TypeHelper.prototype.getVariableInfo = function (node) {
        var ident = node;
        var symbol = this.typeChecker.getSymbolAtLocation(ident);
        if (symbol != null)
            return this.variables[symbol.valueDeclaration.pos];
        else
            return null;
    };
    /** Get textual representation of type of the parameter for inserting into the C code */
    TypeHelper.prototype.getTypeString = function (source) {
        if (source.flags != null && source.intrinsicName != null)
            source = this.convertType(source);
        else if (source.flags != null && source.callSignatures != null && source.constructSignatures != null)
            source = this.convertType(source);
        else if (source.kind != null && source.flags != null)
            source = this.getCType(source);
        else if (source.name != null && source.flags != null && source.valueDeclaration != null && source.declarations != null)
            source = this.variables[source.valueDeclaration.pos].type;
        if (source instanceof ArrayType)
            return source.getText();
        else if (source instanceof StructType)
            return source.getText();
        else if (source instanceof DictType)
            return source.getText();
        else if (typeof source === 'string')
            return source;
        else
            throw new Error("Unrecognized type source");
    };
    /** Convert ts.Type to CType */
    /** Used mostly during type preprocessing stage */
    TypeHelper.prototype.convertType = function (tsType, ident) {
        if (!tsType || tsType.flags == ts.TypeFlags.Void)
            return "void";
        if (tsType.flags == ts.TypeFlags.String)
            return exports.StringVarType;
        if (tsType.flags == ts.TypeFlags.Number)
            return exports.NumberVarType;
        if (tsType.flags == ts.TypeFlags.Boolean)
            return exports.BooleanVarType;
        if (tsType.flags & ts.TypeFlags.ObjectType && tsType.getProperties().length > 0) {
            return this.generateStructure(tsType, ident);
        }
        if (tsType.flags == ts.TypeFlags.Any)
            return exports.PointerVarType;
        console.log("Non-standard type: " + this.typeChecker.typeToString(tsType));
        return exports.UniversalVarType;
    };
    TypeHelper.prototype.addNewIteratorVariable = function (scopeNode) {
        var parentFunc = this.findParentFunction(scopeNode);
        var scopeId = parentFunc && parentFunc.pos + 1 || 'main';
        var existingSymbolNames = this.typeChecker.getSymbolsInScope(scopeNode, ts.SymbolFlags.Variable).map(function (s) { return s.name; });
        if (!this.temporaryVariables[scopeId])
            this.temporaryVariables[scopeId] = [];
        existingSymbolNames = existingSymbolNames.concat(this.temporaryVariables[scopeId]);
        var i = 0;
        while (i < this.iteratorVarNames.length && existingSymbolNames.indexOf(this.iteratorVarNames[i]) > -1)
            i++;
        var iteratorVarName;
        if (i == this.iteratorVarNames.length) {
            i = 2;
            while (existingSymbolNames.indexOf("i_" + i) > -1)
                i++;
            iteratorVarName = "i_" + i;
        }
        else
            iteratorVarName = this.iteratorVarNames[i];
        this.temporaryVariables[scopeId].push(iteratorVarName);
        return iteratorVarName;
    };
    TypeHelper.prototype.addNewTemporaryVariable = function (scopeNode, proposedName) {
        var parentFunc = this.findParentFunction(scopeNode);
        var scopeId = parentFunc && parentFunc.pos + 1 || 'main';
        var existingSymbolNames = this.typeChecker.getSymbolsInScope(scopeNode, ts.SymbolFlags.Variable).map(function (s) { return s.name; });
        if (!this.temporaryVariables[scopeId])
            this.temporaryVariables[scopeId] = [];
        existingSymbolNames = existingSymbolNames.concat(this.temporaryVariables[scopeId]);
        if (existingSymbolNames.indexOf(proposedName) > -1) {
            var i = 2;
            while (existingSymbolNames.indexOf(proposedName + "_" + i) > -1)
                i++;
            proposedName = proposedName + "_" + i;
        }
        this.temporaryVariables[scopeId].push(proposedName);
        return proposedName;
    };
    TypeHelper.prototype.findParentFunction = function (node) {
        var parentFunc = node;
        while (parentFunc && parentFunc.kind != ts.SyntaxKind.FunctionDeclaration) {
            parentFunc = parentFunc.parent;
        }
        return parentFunc;
    };
    TypeHelper.prototype.findVariablesRecursively = function (node) {
        var _this = this;
        if (node.kind == ts.SyntaxKind.CallExpression) {
            var call = node;
            if (call.expression.kind == ts.SyntaxKind.Identifier) {
                var funcSymbol = this.typeChecker.getSymbolAtLocation(call.expression);
                if (funcSymbol != null) {
                    var funcDeclPos = funcSymbol.valueDeclaration.pos + 1;
                    for (var i = 0; i < call.arguments.length; i++) {
                        var determinedType = this.determineType(null, call.arguments[i]);
                        var callData = this.functionCallsData[funcDeclPos] || [];
                        this.functionCallsData[funcDeclPos] = callData;
                        if (!callData[i] || callData[i] == exports.UniversalVarType || callData[i] instanceof TypePromise)
                            callData[i] = determinedType;
                    }
                }
            }
        }
        else if (node.kind == ts.SyntaxKind.ArrayLiteralExpression) {
            if (!this.arrayLiteralsTypes[node.pos])
                this.determineArrayType(node);
        }
        else if (node.kind == ts.SyntaxKind.ObjectLiteralExpression) {
            if (!this.objectLiteralsTypes[node.pos]) {
                var type = this.generateStructure(this.typeChecker.getTypeAtLocation(node));
                this.objectLiteralsTypes[node.pos] = type;
            }
        }
        else if (node.kind == ts.SyntaxKind.Identifier) {
            var symbol = this.typeChecker.getSymbolAtLocation(node);
            if (symbol) {
                var varPos = symbol.valueDeclaration.pos;
                if (!this.variables[varPos]) {
                    this.variables[varPos] = new VariableInfo();
                    this.variablesData[varPos] = new VariableData();
                    this.variables[varPos].name = node.getText();
                    this.variables[varPos].declaration = symbol.declarations[0];
                    this.variablesData[varPos].tsType = this.typeChecker.getTypeAtLocation(node);
                }
                var varInfo = this.variables[varPos];
                var varData = this.variablesData[varPos];
                varInfo.references.push(node);
                if (node.parent && node.parent.kind == ts.SyntaxKind.VariableDeclaration) {
                    var varDecl = node.parent;
                    if (varDecl.name.getText() == node.getText()) {
                        this.addTypeToVariable(varPos, varDecl.name, varDecl.initializer);
                        if (varDecl.initializer && varDecl.initializer.kind == ts.SyntaxKind.ObjectLiteralExpression)
                            varData.objLiteralAssigned = true;
                        if (varDecl.parent && varDecl.parent.parent && varDecl.parent.parent.kind == ts.SyntaxKind.ForOfStatement) {
                            var forOfStatement = varDecl.parent.parent;
                            if (forOfStatement.initializer.kind == ts.SyntaxKind.VariableDeclarationList) {
                                var forOfInitializer = forOfStatement.initializer;
                                if (forOfInitializer.declarations[0].pos == varDecl.pos) {
                                    varData.typePromises.push(new TypePromise(forOfStatement.expression, true));
                                }
                            }
                        }
                    }
                }
                else if (node.parent && node.parent.kind == ts.SyntaxKind.Parameter) {
                    var funcDecl = node.parent.parent;
                    for (var i = 0; i < funcDecl.parameters.length; i++) {
                        if (funcDecl.parameters[i].pos == node.pos) {
                            var param = funcDecl.parameters[i];
                            varData.parameterIndex = i;
                            varData.parameterFuncDeclPos = funcDecl.pos + 1;
                            this.addTypeToVariable(varPos, node, param.initializer);
                            break;
                        }
                    }
                }
                else if (node.parent && node.parent.kind == ts.SyntaxKind.BinaryExpression) {
                    var binExpr = node.parent;
                    if (binExpr.left.kind == ts.SyntaxKind.Identifier
                        && binExpr.left.getText() == node.getText()
                        && binExpr.operatorToken.kind == ts.SyntaxKind.EqualsToken) {
                        this.addTypeToVariable(varPos, binExpr.left, binExpr.right);
                        if (binExpr.right && binExpr.right.kind == ts.SyntaxKind.ObjectLiteralExpression)
                            varData.objLiteralAssigned = true;
                    }
                }
                else if (node.parent && node.parent.kind == ts.SyntaxKind.PropertyAccessExpression) {
                    var propAccess = node.parent;
                    if (propAccess.expression.pos == node.pos && propAccess.parent.kind == ts.SyntaxKind.BinaryExpression) {
                        var binExpr = propAccess.parent;
                        if (binExpr.left.pos == propAccess.pos && binExpr.operatorToken.kind == ts.SyntaxKind.EqualsToken) {
                            var determinedType = this.determineType(propAccess.name, binExpr.right);
                            if (!(determinedType instanceof TypePromise))
                                varData.addedProperties[propAccess.name.getText()] = determinedType;
                        }
                    }
                    if (propAccess.expression.kind == ts.SyntaxKind.Identifier && propAccess.name.getText() == "push") {
                        varData.isDynamicArray = true;
                        var determinedType = exports.UniversalVarType;
                        if (propAccess.parent && propAccess.parent.kind == ts.SyntaxKind.CallExpression) {
                            var call = propAccess.parent;
                            if (call.arguments.length == 1)
                                determinedType = this.determineType(propAccess.expression, call.arguments[0]);
                        }
                        if (determinedType instanceof TypePromise) {
                            determinedType.arrayOf = true;
                            varData.typePromises.push(determinedType);
                        }
                        else {
                            if (determinedType instanceof ArrayType)
                                determinedType.isDynamicArray = true;
                            var dtString = typeof determinedType === 'string' ? determinedType : determinedType.getText();
                            var found = false;
                            for (var _i = 0, _a = Object.keys(varData.assignmentTypes); _i < _a.length; _i++) {
                                var tk = _a[_i];
                                var at = varData.assignmentTypes[tk];
                                if (at instanceof ArrayType) {
                                    var atElementType = at.elementType;
                                    var atElementTypeString = typeof atElementType === 'string' ? atElementType : atElementType.getText();
                                    if (atElementTypeString === dtString) {
                                        found = true;
                                        break;
                                    }
                                }
                            }
                            if (!found) {
                                var arrayOfType = new ArrayType(determinedType, 0, true);
                                varData.assignmentTypes[arrayOfType.getText()] = arrayOfType;
                            }
                        }
                    }
                    if (propAccess.expression.kind == ts.SyntaxKind.Identifier && propAccess.name.getText() == "pop") {
                        varData.isDynamicArray = true;
                    }
                }
                else if (node.parent && node.parent.kind == ts.SyntaxKind.ElementAccessExpression) {
                    var elemAccess = node.parent;
                    if (elemAccess.expression.pos == node.pos) {
                        var determinedType = exports.UniversalVarType;
                        if (elemAccess.parent && elemAccess.parent.kind == ts.SyntaxKind.BinaryExpression) {
                            var binExpr = elemAccess.parent;
                            if (binExpr.left.pos == elemAccess.pos && binExpr.operatorToken.kind == ts.SyntaxKind.EqualsToken) {
                                determinedType = this.determineType(elemAccess.expression, binExpr.right);
                            }
                        }
                        if (elemAccess.argumentExpression.kind == ts.SyntaxKind.StringLiteral) {
                            var propName = elemAccess.argumentExpression.getText().slice(1, -1);
                            if (determinedType instanceof TypePromise) {
                                determinedType.associatedProperty = propName;
                                varData.typePromises.push(determinedType);
                            }
                            varData.addedProperties[propName] = varData.addedProperties[propName] || exports.UniversalVarType;
                            if (!(determinedType instanceof TypePromise) && varData.addedProperties[propName] == exports.UniversalVarType)
                                varData.addedProperties[propName] = determinedType;
                        }
                        else if (elemAccess.argumentExpression.kind == ts.SyntaxKind.NumericLiteral) {
                            if (determinedType instanceof TypePromise) {
                                determinedType.arrayOf = true;
                                varData.typePromises.push(determinedType);
                            }
                            else {
                                for (var atKey in varData.assignmentTypes) {
                                    var at = varData.assignmentTypes[atKey];
                                    if (at instanceof ArrayType && at.elementType == exports.UniversalVarType)
                                        at.elementType = determinedType;
                                }
                            }
                        }
                        else {
                            varData.isDict = true;
                            if (determinedType instanceof TypePromise) {
                                determinedType.arrayOf = true;
                                varData.typePromises.push(determinedType);
                            }
                            else {
                                for (var atKey in varData.assignmentTypes) {
                                    var at = varData.assignmentTypes[atKey];
                                    if (at instanceof StructType) {
                                        delete varData.assignmentTypes[atKey];
                                        var dictType = new DictType(determinedType);
                                        varData.assignmentTypes[dictType.getText()] = dictType;
                                    }
                                }
                            }
                        }
                    }
                }
                else if (node.parent && node.parent.kind == ts.SyntaxKind.ForOfStatement) {
                    var forOfStatement = node.parent;
                    if (forOfStatement.initializer.kind == ts.SyntaxKind.Identifier && forOfStatement.initializer.pos == node.pos) {
                        varData.typePromises.push(new TypePromise(forOfStatement.expression, true));
                    }
                }
            }
        }
        node.getChildren().forEach(function (c) { return _this.findVariablesRecursively(c); });
    };
    TypeHelper.prototype.resolvePromisesAndFinalizeTypes = function () {
        var somePromisesAreResolved;
        do {
            somePromisesAreResolved = false;
            for (var _i = 0, _a = Object.keys(this.variables).map(function (k) { return +k; }); _i < _a.length; _i++) {
                var k = _a[_i];
                var types = Object.keys(this.variablesData[k].assignmentTypes).filter(function (t) { return t != exports.PointerVarType && t != exports.UniversalVarType; });
                if (types.length == 1) {
                    var varType = this.variablesData[k].assignmentTypes[types[0]];
                    if (varType instanceof ArrayType) {
                        varType.isDynamicArray = varType.isDynamicArray || this.variablesData[k].isDynamicArray;
                        if (this.variablesData[k].isDynamicArray)
                            this.variables[k].requiresAllocation = true;
                    }
                    else if (varType instanceof StructType && this.variablesData[k].objLiteralAssigned) {
                        this.variables[k].requiresAllocation = true;
                    }
                    else if (varType instanceof DictType) {
                        this.variables[k].requiresAllocation = true;
                    }
                    if (varType instanceof StructType) {
                        for (var addPropKey in this.variablesData[k].addedProperties) {
                            var addPropType = this.variablesData[k].addedProperties[addPropKey];
                            if (!(addPropType instanceof TypePromise))
                                varType.properties[addPropKey] = addPropType;
                        }
                    }
                    this.variables[k].type = varType;
                }
                else if (types.length == 0) {
                    this.variables[k].type = exports.PointerVarType;
                }
                else {
                    this.variables[k].requiresAllocation = true;
                    this.variables[k].type = exports.UniversalVarType;
                }
                somePromisesAreResolved = somePromisesAreResolved || this.tryResolvePromises(k);
            }
        } while (somePromisesAreResolved);
    };
    TypeHelper.prototype.tryResolvePromises = function (varPos) {
        var somePromisesAreResolved = false;
        var funcDeclPos = this.variablesData[varPos].parameterFuncDeclPos;
        if (funcDeclPos && this.functionCallsData[funcDeclPos]) {
            var paramIndex = this.variablesData[varPos].parameterIndex;
            var type = this.functionCallsData[funcDeclPos][paramIndex];
            var finalType = !(type instanceof TypePromise) && type;
            if (type instanceof TypePromise) {
                finalType = this.getCType(type.associatedNode) || finalType;
                if (finalType) {
                    type.resolved = true;
                }
            }
            if (finalType && !this.variablesData[varPos].assignmentTypes[this.getTypeString(finalType)]) {
                somePromisesAreResolved = true;
                this.variablesData[varPos].assignmentTypes[this.getTypeString(finalType)] = finalType;
            }
        }
        if (this.variablesData[varPos].typePromises.length > 0) {
            var promises = this.variablesData[varPos].typePromises.filter(function (p) { return !p.resolved; });
            for (var _i = 0, promises_1 = promises; _i < promises_1.length; _i++) {
                var promise = promises_1[_i];
                var resolvedType = this.getCType(promise.associatedNode);
                if (resolvedType != null) {
                    var finalType = resolvedType;
                    promise.resolved = true;
                    somePromisesAreResolved = true;
                    if (promise.arrayOf)
                        finalType = new ArrayType(resolvedType, 0, true);
                    else if (resolvedType instanceof StructType && promise.element) {
                        var propName = promise.element;
                        if (typeof propName === 'string') {
                            finalType = resolvedType.properties[propName];
                        }
                    }
                    else if (resolvedType instanceof ArrayType && promise.element) {
                        finalType = resolvedType.elementType;
                    }
                    if (promise.associatedProperty) {
                        this.variablesData[varPos].addedProperties[promise.associatedProperty] = finalType;
                    }
                    else {
                        if (typeof finalType === 'string')
                            this.variablesData[varPos].assignmentTypes[finalType] = finalType;
                        else
                            this.variablesData[varPos].assignmentTypes[finalType.getText()] = finalType;
                    }
                }
            }
        }
        return somePromisesAreResolved;
    };
    TypeHelper.prototype.addTypeToVariable = function (varPos, left, right) {
        var determinedType = this.determineType(left, right);
        if (determinedType instanceof TypePromise)
            this.variablesData[varPos].typePromises.push(determinedType);
        else
            this.variablesData[varPos].assignmentTypes[this.getTypeString(determinedType)] = determinedType;
    };
    TypeHelper.prototype.determineType = function (left, right) {
        var tsType = right ? this.typeChecker.getTypeAtLocation(right) : this.typeChecker.getTypeAtLocation(left);
        if (right && right.kind == ts.SyntaxKind.ObjectLiteralExpression) {
            var type = this.generateStructure(tsType, left);
            this.objectLiteralsTypes[right.pos] = type;
            return type;
        }
        else if (right && right.kind == ts.SyntaxKind.ArrayLiteralExpression)
            return this.determineArrayType(right);
        else if (right && (right.kind == ts.SyntaxKind.PropertyAccessExpression
            || right.kind == ts.SyntaxKind.ElementAccessExpression
            || right.kind == ts.SyntaxKind.Identifier)) {
            return new TypePromise(right, false);
        }
        else {
            return this.convertType(tsType, left);
        }
    };
    TypeHelper.prototype.generateStructure = function (tsType, ident) {
        var structName = "struct_" + Object.keys(this.userStructs).length + "_t";
        var varName = ident && ident.getText();
        if (varName) {
            if (this.userStructs[varName + "_t"] == null)
                structName = varName + "_t";
            else {
                var i = 2;
                while (this.userStructs[varName + "_" + i + "_t"] != null)
                    i++;
                structName = varName + "_" + i + "_t";
            }
        }
        var userStructInfo = {};
        for (var _i = 0, _a = tsType.getProperties(); _i < _a.length; _i++) {
            var prop = _a[_i];
            var propTsType = this.typeChecker.getTypeOfSymbolAtLocation(prop, prop.valueDeclaration);
            var propType = this.convertType(propTsType, prop.valueDeclaration.name);
            if (propType == exports.UniversalVarType && prop.valueDeclaration.kind == ts.SyntaxKind.PropertyAssignment) {
                var propAssignment = prop.valueDeclaration;
                if (propAssignment.initializer && propAssignment.initializer.kind == ts.SyntaxKind.ArrayLiteralExpression)
                    propType = this.determineArrayType(propAssignment.initializer);
            }
            userStructInfo[prop.name] = propType;
        }
        var userStructCode = this.getStructureBodyString(userStructInfo);
        var found = false;
        if (Object.keys(userStructInfo).length > 0) {
            for (var s in this.userStructs) {
                if (this.getStructureBodyString(this.userStructs[s].properties) == userStructCode) {
                    structName = s;
                    found = true;
                    break;
                }
            }
        }
        if (!found)
            this.userStructs[structName] = new StructType('struct ' + structName + ' *', userStructInfo);
        return this.userStructs[structName];
    };
    TypeHelper.prototype.getStructureBodyString = function (properties) {
        var userStructCode = '{\n';
        for (var propName in properties) {
            var propType = properties[propName];
            if (typeof propType === 'string') {
                userStructCode += '    ' + propType + ' ' + propName + ';\n';
            }
            else if (propType instanceof ArrayType) {
                var propTypeText = propType.getText();
                if (propTypeText.indexOf("{var}") > -1)
                    userStructCode += '    ' + propTypeText.replace(/^static /, '').replace("{var}", propName) + ';\n';
                else
                    userStructCode += '    ' + propTypeText + ' ' + propName + ';\n';
            }
            else {
                userStructCode += '    ' + propType.getText() + ' ' + propName + ';\n';
            }
        }
        userStructCode += "};\n";
        return userStructCode;
    };
    TypeHelper.prototype.determineArrayType = function (arrLiteral) {
        var elementType;
        if (arrLiteral.elements.length > 0)
            elementType = this.convertType(this.typeChecker.getTypeAtLocation(arrLiteral.elements[0]));
        else
            return exports.UniversalVarType;
        var cap = arrLiteral.elements.length;
        var type = new ArrayType(elementType, cap, false);
        this.arrayLiteralsTypes[arrLiteral.pos] = type;
        return type;
    };
    return TypeHelper;
}());
exports.TypeHelper = TypeHelper;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],14:[function(require,module,exports){
(function (process,global){
"use strict";
var program_1 = require('./src/program');
var ts = (typeof window !== "undefined" ? window['ts'] : typeof global !== "undefined" ? global['ts'] : null);
// Public API
if (typeof window !== 'undefined')
    window["ts2c"] = {
        transpile: function (source) {
            var sourceFile = ts.createSourceFile('source.ts', source, ts.ScriptTarget.ES5, true);
            var compilerHost = {
                getSourceFile: function (fileName, target) { return 'source.ts' ? sourceFile : null; },
                writeFile: function (name, text, writeByteOrderMark) { },
                getDefaultLibFileName: function () { return "lib.d.ts"; },
                useCaseSensitiveFileNames: function () { return false; },
                getCanonicalFileName: function (fileName) { return fileName; },
                getCurrentDirectory: function () { return ""; },
                getNewLine: function () { return "\n"; },
                fileExists: function (fileName) { return fileName == 'source.ts'; },
                readFile: function (fileName) { return fileName == 'source.ts' ? source : null; },
                directoryExists: function (dirName) { return dirName == ""; },
            };
            var program = ts.createProgram(['source.ts'], { noLib: true }, compilerHost);
            return new program_1.CProgram(program)["resolve"]();
        }
    };
// When used in Node environment, this file is also a command line tool
(function () {
    if (typeof process !== 'undefined' && process.nextTick && !process.browser && typeof require !== "undefined") {
        var fs = require('fs');
        if (process.argv.length < 2)
            process.exit();
        var fileNames = process.argv.slice(2);
        var program = ts.createProgram(fileNames, { noLib: true });
        var output = new program_1.CProgram(program)["resolve"]();
        fs.writeFileSync(fileNames[0].slice(0, -3) + '.c', output);
        process.exit();
    }
})();

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./src/program":11,"_process":2,"fs":1}]},{},[14]);
