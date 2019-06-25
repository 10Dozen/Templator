console.log( "init!" );

window.Templator = {
	templates: window.Templates
	, activeTemplateName: ""
	, activeTemplate: {}
	, activeCombinations: []
	, combineAll: true
	, editorOpened: false
	, $editorTextarea: null
	, elements: {
		"input": "<div class=\"col-2\"><input></input></div>"
		,"output_panel": "<div class=\"output-title\"><span>Result %1:</span><div class=\"output-panel\">%2</div></div>"
		,"editor": "<br /><textarea class='editor-area' /><hr/><textarea disabled='1' class='disabled-editor-area'>...</textarea><hr/>"
	}
	
	, getTemplateByName: function (name) {
		let found = this.templates.find(function (t) { return t.name.toLowerCase() == this }, name.toLowerCase());
		if (found == null) { console.log("ERROR: No template found! Searched for ".concat(name)) };

		return found
	}
	, setTemplatesList: function () {

		$("#template-selector").html("");

		let templates = ( [{name: " --- Select template --- "}] ).concat( this.templates );
		for (let i = 0; i < templates.length; ++i) {
			let t = templates[i];
			let name = t.name;

			$("#template-selector").append("<option>".concat(t.name).concat("</option>"))
		}
	}
	, setActiveTemplate: function (name) {
		this.activeTemplateName = name;

		if (this.editorOpened) {
			this.toggleEditor(); // Close editor on swithing
		}

		this.activeTemplate = this.getTemplateByName(name);
		this.initFormByTemplate();
	}
	, initFormByTemplate: function () {
		let $panel = $("#central-panel");

		// --- Clear inputs
		$panel.html(""); 

		// --- Add basic inputs
		let inputs = this.activeTemplate.inputs;
		let keys = Object.keys(inputs);

		for (let i = 0; i < keys.length; ++i) {
			let name = inputs[keys[i]].name;
			let tooltip = inputs[keys[i]].tooltip;

			$panel.append("<div class=\"input-panel\" type=\"" + keys[i] + "\">"
				+ "<div class=\"col-2\" title=\"" + tooltip + "\"><span>" + name + "</span></div>"
				+ this.elements.input + "</div>");

			this.setIputsEvents(keys[i]);
		}

		this.updateOutputText();
	}
	, addInput: function (type) {
		$(".input-panel[type=\"" + type + "\"]").append(this.elements.input);
		this.setIputsEvents(type);
	}
	, removeEmptyInput: function (type) {
		let $panel = $(".input-panel[type=\"" + type + "\"]");
		let inputDivs = $panel.find("div");
		let inputCount = inputDivs.length;

		// --- Exit if there is only on input
		if (inputCount <= 2) { return; } 

		let removedCount = 0;
		for (let i = 1; i < (inputCount - 1); ++i) {
			let $input = $(inputDivs[i]);
			let inputValue = $input.find("input").val();
			
			// --- Remove empty input field
			if (inputValue === "") { 
				// --- Delete inputs, but leave at least one
				if (removedCount+1 < inputCount) {
					$input.remove();
					++removedCount;
				}
			}
		}

		this.setIputsEvents(type);
	}
	, switchCombineMode: function (combineAll) {
		this.combineAll = combineAll;
		this.updateOutputText();
	}

	, setIputsEvents: function (type) {		
		this.removeInputEvents(type);
		let inputs = $(".input-panel[type=\"" + type + "\"] > div > input");

		for (let i = 0; i < inputs.length; ++i) {
			$(inputs[i]).on("change", function () {

				Templator.updateOutputText();

				if ($(this).val() === "") {
					let type = $(this).parent().parent().attr("type");
					Templator.removeEmptyInput(type);
				}
			})

			if (i+1 == inputs.length) {
				// Add event to add new field on edit
				$(inputs[i]).on("input", function () {
					if ($(this).val() === "") { return; }

					let type = $(this).parent().parent().attr("type");
					Templator.addInput(type);
				})
					
			}
		}
	}
	, removeInputEvents: function (type) {
		let inputs = $(".input-panel[type=\"" + type + "\"] > div > input");
		for (let i = 0; i < inputs.length; ++i) {
			$(inputs[i]).off("change");
			$(inputs[i]).off("input");
		}

		return;
	}

	, combineInputValues: function (arrValues, index, leading, combinations) {
		let vals = arrValues[index];
		for (let i = 0; i < vals.length; ++i) {
			let newLeading = leading.concat(vals[i]);
			if (arrValues.length > index+1) {
				this.combineInputValues(arrValues, index+1, newLeading, combinations);
			} else {
				combinations.push(newLeading);
			}
		}
	}
	, combineInputValuesByColumn: function (arrValues, combinations) {
		let maxSize = 0;
		for (let i=0; i<arrValues.length; ++i) {
			maxSize = Math.max(maxSize, arrValues[i].length);
		}

		for (let i=0; i < maxSize; ++i) {
			let columnCombo = [];

			for (let j=0; j < arrValues.length; ++j) {
				let row = arrValues[j];
				columnCombo.push( row[Math.min(row.length - 1, i)] ); // Add current column value or last available for row
			}
			combinations.push(columnCombo);
		}

		return;
	}
	, updateOutputText: function () {
		let $out = $("#bottom-panel");
		$out.html("");

		let arrValues = [];
		this.activeCombinations = [];
		let inputGroups = $("#central-panel > div");

		// Collect all inputs value in 2d array (rows x columns)
		for (let i = 0; i < inputGroups.length; ++i) {
			let inputs = $(inputGroups[i]).find("div > input");
			let inputValues = [];

			for (let j = 0; j < (inputs.length-1); j++) {
				let val = $(inputs[j]).val();

				if (val != "") { inputValues.push(val) }
			}

			arrValues.push(inputValues);
		}

		if (this.combineAll) {
			// Combine all with all			
			this.combineInputValues(arrValues, 0, [], this.activeCombinations);
		} else {
			// Combine within columns
			this.combineInputValuesByColumn(arrValues, this.activeCombinations)
		}

		let $panel = $("#bottom-panel");
		if (this.activeCombinations.length == 0) {
			let panelText = (this.elements.output_panel).replace("%1", "Example").replace("%2", (this.activeTemplate.body));
			$panel.append(panelText);

			return;
		}
		
		for (let i = 0; i < this.activeCombinations.length; ++i) {
			let combo = this.activeCombinations[i];
			let text = "" + (this.activeTemplate.body);
			for (let j = 0; j < combo.length; ++j) {
				text = text.replace(new RegExp("%" + (j + 1), "gi"), combo[j]);
			}

			let panelText = (this.elements.output_panel).replace("%1", i+1).replace("%2", text);
			$panel.append(panelText);
		}
	}

	// Editor
	, unEscapeTags: function (text) {
		return text.replace(/<br>/g, "\r\n").replace(/<br\/>/g, "\r\n").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/(&nbsp;){4}/g, "	")
	}
	, escapeTags: function (text) {
		return text.replace(/	/g,"&nbsp;&nbsp;&nbsp;&nbsp;").replace(/>/g,"&gt;").replace(/</g,"&lt;").replace(/(?:\r\n|\r|\n)/g, "<br>")
	}
	, toggleEditor: function () {
		this.editorOpened = !this.editorOpened;

		if (this.editorOpened) { 
			$("#editor-pane").append(this.elements.editor);
			this.$editorTextarea = $(".editor-area");
			
			$(".disabled-editor-area").val(this.activeTemplate.body);
			this.$editorTextarea.val(this.unEscapeTags(this.activeTemplate.body));

			this.$editorTextarea.on("change", function () {
				Templator.editTemplateText();
			})

		} else {
			this.$editorTextarea.off("change");
			$("#editor-pane").html("");
		}
	}
	, editTemplateText: function () {
		let newBody = this.escapeTags(this.$editorTextarea.val());

		this.activeTemplate.body = newBody;		
		$(".disabled-editor-area").val(newBody);

		this.updateOutputText();
	}

	, initEvents: function () {
		$("#template-selector").on("change", function () {
			let selected = $(this).val();
			Templator.setActiveTemplate(selected);
		});
		$("#combine-mode-chbx").on("change", function () {
			let selected = $(this).prop('checked');
			Templator.switchCombineMode(!selected);
		});
		$("#editor-btn").on("click", function () {
			Templator.toggleEditor();
		});
	}
	, init: function () {
		this.initEvents();
		this.setTemplatesList();
		console.log("Initialized");
	}
};


$( document ).ready(function() {
	console.log( "ready!" );

	Templator.init();
});
