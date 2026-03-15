{{/*
Common labels
*/}}
{{- define "paganini.labels" -}}
app.kubernetes.io/name: paganini-aios
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "paganini.selectorLabels" -}}
app.kubernetes.io/name: paganini-aios
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Full name
*/}}
{{- define "paganini.fullname" -}}
{{ .Release.Name }}-paganini
{{- end }}
